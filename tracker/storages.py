# tracker/storages.py
import io
import json
import os
from urllib.parse import quote

import msal
import requests
from django.core.files.storage import Storage
from django.core.files.base import File
from django.utils.functional import cached_property


class SharePointMediaStorage(Storage):
    """
    Django Storage backend that saves media files into SharePoint (Microsoft Graph).
    - Uses client credentials (application permissions).
    - Saves new files under BASE_PATH/Active/... by default.
    - Provides 'url()' that returns the SharePoint webUrl (viewer/download UI).
    - Provides 'move_between_state()' to relocate a file between Active <-> Inactive.
    """

    def __init__(self, **kwargs):
        # Graph / AAD
        self.tenant_id = os.getenv("MS_TENANT_ID")
        self.client_id = os.getenv("MS_CLIENT_ID")
        self.client_secret = os.getenv("MS_CLIENT_SECRET")

        # SharePoint site & library
        self.site_hostname = os.getenv("SP_SITE_HOSTNAME")
        self.site_path = os.getenv("SP_SITE_PATH")  # e.g. /sites/epaw
        self.drive_name = os.getenv("SP_DRIVE_NAME", "Documents")

        # Base paths
        self.base_path = (os.getenv("SP_BASE_PATH", "").strip("/"))
        self.active_dir = (os.getenv("SP_ACTIVE_SUBFOLDER", "Active").strip("/"))
        self.inactive_dir = (os.getenv("SP_ARCHIVE_SUBFOLDER", "Inactive").strip("/"))

        # Upload chunk size (bytes) for >4MB uploads
        self.chunk_size = int(os.getenv("SP_CHUNK_SIZE", str(2 * 1024 * 1024)))  # 2MB

        # Basic validation
        for k, v in [
            ("MS_TENANT_ID", self.tenant_id),
            ("MS_CLIENT_ID", self.client_id),
            ("MS_CLIENT_SECRET", self.client_secret),
            ("SP_SITE_HOSTNAME", self.site_hostname),
            ("SP_SITE_PATH", self.site_path),
        ]:
            if not v:
                raise RuntimeError(f"Missing env var: {k}")

    # ---------- Graph auth ----------

    @cached_property
    def _msal_app(self):
        # Confidential client with in-memory cache (process lifetime)
        return msal.ConfidentialClientApplication(
            client_id=self.client_id,
            client_credential=self.client_secret,
            authority=f"https://login.microsoftonline.com/{self.tenant_id}",
        )

    def _get_token(self) -> str:
        # Acquire token for app-only
        result = self._msal_app.acquire_token_silent(scopes=["https://graph.microsoft.com/.default"], account=None)
        if not result:
            result = self._msal_app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        if "access_token" not in result:
            raise RuntimeError(f"Graph auth failed: {result}")
        return result["access_token"]

    def _headers(self):
        return {"Authorization": f"Bearer {self._get_token()}"}

    # ---------- Site / Drive discovery ----------

    @cached_property
    def _site(self) -> dict:
        # GET /sites/{host}:{path}
        url = f"https://graph.microsoft.com/v1.0/sites/{self.site_hostname}:{quote(self.site_path)}"
        r = requests.get(url, headers=self._headers(), timeout=30)
        if r.status_code != 200:
            raise RuntimeError(f"Cannot resolve site: {r.text}")
        return r.json()

    @cached_property
    def _site_id(self) -> str:
        return self._site["id"]

    @cached_property
    def _drive_id(self) -> str:
        # GET /sites/{siteId}/drives  -> choose by name (e.g. 'Documents')
        url = f"https://graph.microsoft.com/v1.0/sites/{self._site_id}/drives"
        r = requests.get(url, headers=self._headers(), timeout=30)
        if r.status_code != 200:
            raise RuntimeError(f"Cannot list drives: {r.text}")
        data = r.json().get("value", [])
        for d in data:
            if d.get("name") == self.drive_name:
                return d["id"]
        # Fallback: default document library is often the first
        if data:
            return data[0]["id"]
        raise RuntimeError("No drives found on site.")

    # ---------- Path helpers ----------

    def _norm(self, *parts: str) -> str:
        # Join parts using forward slashes, removing empty segments
        segs = []
        for p in parts:
            p = (p or "").strip("/")
            if p:
                segs.append(p)
        return "/".join(segs)

    def _active_path_for_name(self, name: str) -> str:
        # Store new files under BASE/Active/<upload_to/name>
        return self._norm(self.base_path, self.active_dir, name)

    def _inactive_path_for_name(self, name: str) -> str:
        return self._norm(self.base_path, self.inactive_dir, name)

    def _item_by_path(self, path: str) -> dict | None:
        # GET /drives/{driveId}/root:/path
        url = f"https://graph.microsoft.com/v1.0/drives/{self._drive_id}/root:/{quote(path)}"
        r = requests.get(url, headers=self._headers(), timeout=30)
        if r.status_code == 200:
            return r.json()
        if r.status_code == 404:
            return None
        raise RuntimeError(f"Lookup failed: {r.text}")

    def _ensure_folders(self, folder_path: str) -> None:
        """
        Ensure all folders in 'folder_path' exist.
        Graph: create folder by POST to parent/children with { folder: {} }.
        """
        parts = [p for p in folder_path.split("/") if p]
        if not parts:
            return
        # Walk from root/<base> creating as needed
        parent = f"/{self.base_path}" if self.base_path else ""
        for idx, seg in enumerate(parts):
            current = (parent + "/" + seg).strip("/")
            # Check exists
            it = self._item_by_path(current)
            if not it:
                # Create folder
                parent_item = self._item_by_path(parent.strip("/")) if parent else self._item_by_path("")
                parent_id = parent_item["id"] if parent_item else "root"
                url = f"https://graph.microsoft.com/v1.0/drives/{self._drive_id}/items/{parent_id}/children"
                payload = {
                    "name": seg,
                    "folder": {},
                    "@microsoft.graph.conflictBehavior": "replace",
                }
                r = requests.post(url, headers={**self._headers(), "Content-Type": "application/json"},
                                  data=json.dumps(payload), timeout=30)
                if r.status_code not in (200, 201):
                    # If conflict and exists, continue; else fail
                    if r.status_code != 409:
                        raise RuntimeError(f"Create folder '{current}' failed: {r.text}")
            parent = current

    # ---------- Upload ----------

    def _upload_small(self, path: str, content: bytes) -> dict:
        # PUT /root:/path:/content (<= 4 MB)
        url = f"https://graph.microsoft.com/v1.0/drives/{self._drive_id}/root:/{quote(path)}:/content"
        r = requests.put(url, headers=self._headers(), data=content, timeout=60)
        if r.status_code not in (200, 201):
            raise RuntimeError(f"Small upload failed: {r.text}")
        return r.json()

    def _upload_large(self, path: str, stream: io.BufferedReader, total_size: int) -> dict:
        # Create upload session
        sess_url = f"https://graph.microsoft.com/v1.0/drives/{self._drive_id}/root:/{quote(path)}:/createUploadSession"
        sess_body = {
            "@microsoft.graph.conflictBehavior": "replace",
            "deferCommit": False,
        }
        r = requests.post(sess_url, headers={**self._headers(), "Content-Type": "application/json"},
                          data=json.dumps(sess_body), timeout=30)
        if r.status_code not in (200, 201):
            raise RuntimeError(f"Create upload session failed: {r.text}")
        upload_url = r.json()["uploadUrl"]

        # Chunked upload
        chunk = self.chunk_size
        sent = 0
        while sent < total_size:
            to_read = min(chunk, total_size - sent)
            data = stream.read(to_read)
            if not data:
                break
            start = sent
            end = sent + len(data) - 1
            headers = {
                "Content-Length": str(len(data)),
                "Content-Range": f"bytes {start}-{end}/{total_size}",
            }
            ru = requests.put(upload_url, headers=headers, data=data, timeout=120)
            if ru.status_code not in (200, 201, 202):
                raise RuntimeError(f"Chunk upload failed: {ru.text}")
            sent = end + 1

        # Last response of PUT 200/201 contains the DriveItem
        if ru.status_code in (200, 201):
            return ru.json()
        # In rare cases, finalize with GET?
        item = self._item_by_path(path)
        if not item:
            raise RuntimeError("Upload completed but item not found.")
        return item

    # ---------- Django Storage API ----------

    def _save(self, name, content):
        """
        Save a new file under BASE/Active/<name>.
        'name' comes from the FileField upload_to (e.g. sources/YYYY/MM/DD/file.ext).
        """
        rel_path = self._active_path_for_name(name)
        folder_path = "/".join(rel_path.split("/")[:-1])
        if folder_path:
            self._ensure_folders(folder_path)

        # Read content and decide small vs large
        if hasattr(content, "seek"):
            content.seek(0)
        # Try to use size if available to avoid reading twice
        size = getattr(content, "size", None)
        if size is None:
            buf = content.read()
            size = len(buf)
            content = io.BytesIO(buf)  # re-wrap for large upload if needed

        if size <= 4 * 1024 * 1024:
            # Small upload: read all bytes
            if hasattr(content, "seek"):
                content.seek(0)
            data = content.read()
            self._upload_small(rel_path, data)
        else:
            # Large upload: stream chunks
            if hasattr(content, "seek"):
                content.seek(0)
            self._upload_large(rel_path, content, size)

        # Return the Django "name" we want to persist inside FileField
        # We store the path relative to BASE (including Active/Inactive).
        return rel_path

    # Django calls 'save' which delegates to _save
    def save(self, name, content, max_length=None):
        if not isinstance(content, (io.BufferedIOBase, io.RawIOBase, File)) and hasattr(content, "open"):
            content.open()
        return super().save(name, content, max_length=max_length)

    def exists(self, name):
        rel_path = name.strip("/")
        return self._item_by_path(rel_path) is not None

    def delete(self, name):
        rel_path = name.strip("/")
        item = self._item_by_path(rel_path)
        if not item:
            return
        url = f"https://graph.microsoft.com/v1.0/drives/{self._drive_id}/items/{item['id']}"
        r = requests.delete(url, headers=self._headers(), timeout=30)
        if r.status_code not in (204,):
            raise RuntimeError(f"Delete failed: {r.text}")

    def url(self, name):
        """
        Return SharePoint 'webUrl' so the user gets the Office viewer / download UI.
        """
        rel_path = name.strip("/")
        item = self._item_by_path(rel_path)
        if not item:
            # Fallback to drive root (will 404 in browser)
            return f"https://{self.site_hostname}"
        return item.get("webUrl") or f"https://{self.site_hostname}"

    # Not supported locally (we don't expose a filesystem path)
    def path(self, name):
        raise NotImplementedError("SharePoint storage has no local path.")

    # ---------- Extra helper for moves Active <-> Inactive ----------

    def move_between_state(self, name: str, to_active: bool) -> str:
        """
        Move a file between Active and Inactive subfolders.
        Returns the new relative path that should be saved back into FileField.name.
        """
        old_rel = name.strip("/")
        base = self.base_path
        # Determine current without state head (remove leading '<base>/<Active|Inactive>/')
        if old_rel.startswith(self._norm(base, self.active_dir) + "/"):
            suffix = old_rel[len(self._norm(base, self.active_dir)) + 1:]
        elif old_rel.startswith(self._norm(base, self.inactive_dir) + "/"):
            suffix = old_rel[len(self._norm(base, self.inactive_dir)) + 1:]
        else:
            # Unknown layout -> treat as suffix
            parts = old_rel.split("/", 1)
            suffix = parts[1] if len(parts) > 1 else parts[0]

        new_rel = self._norm(base, self.active_dir if to_active else self.inactive_dir, suffix)

        # Ensure destination folder
        folder_path = "/".join(new_rel.split("/")[:-1])
        if folder_path:
            self._ensure_folders(folder_path)

        # Move via PATCH /items/{id}
        item = self._item_by_path(old_rel)
        if not item:
            # Nothing to move; return target anyway
            return new_rel

        parent_path = "/" + folder_path if folder_path else "/"
        url = f"https://graph.microsoft.com/v1.0/drives/{self._drive_id}/items/{item['id']}"
        payload = {
            "parentReference": {
                "driveId": self._drive_id,
                "path": f"/drives/{self._drive_id}/root:{parent_path}"
            },
            "name": item["name"],  # keep same filename
        }
        r = requests.patch(url, headers={**self._headers(), "Content-Type": "application/json"},
                           data=json.dumps(payload), timeout=30)
        if r.status_code not in (200, 201):
            raise RuntimeError(f"Move failed: {r.text}")
        return new_rel
