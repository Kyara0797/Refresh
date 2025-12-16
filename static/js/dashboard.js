// /* {% extends "base.html" %}
// {% block content %}
// <div class="container-fluid py-4">
  
//   <!-- ========================= HEADER & CATEGORIES ========================= -->
//   <div class="d-flex justify-content-between align-items-center mb-4">
//     <div>
//       <h2 class="fw-bold text-dark mb-0">
//         <i class="fas fa-chart-line me-2" style="color:#f26522;"></i>Dashboard
//       </h2>
//       {% if user.is_authenticated %}
//         <small class="text-muted">Welcome, {{ user.username }}</small>
//       {% endif %}
//     </div>
    
//     <!-- Categories Dropdown -->
//     <div class="dropdown">
//       <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="categoriesDropdown"
//               data-bs-toggle="dropdown" aria-expanded="false">
//         <i class="fas fa-layer-group me-2" style="color:#f26522;"></i>
//         {% if selected_category %}{{ selected_category.name }}{% else %}All Categories{% endif %}
//       </button>
//       <ul class="dropdown-menu dropdown-menu-end">
//         <li><a class="dropdown-item {% if not selected_category %}active{% endif %}" href="{% url 'dashboard' %}">All Categories</a></li>
//         {% for category in categories %}
//           <li>
//             <a class="dropdown-item {% if selected_category and selected_category.id == category.id %}active{% endif %}"
//                href="{% url 'dashboard' %}?category_id={{ category.id }}">{{ category.name }}</a>
//           </li>
//         {% endfor %}
//       </ul>
//     </div>
//   </div>

//   <!-- ========================= SECTION 1: THREAT DETAIL VIEW ========================= -->
//   {% if selected_theme %}
//   <div class="card border-0 shadow-sm mb-4">
//     <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
//       <h4 class="mb-0">
//         <i class="fas fa-info-circle me-2"></i>{{ selected_theme.name }}
//       </h4>
//       <div class="d-flex gap-2">
//         <a href="{% url 'dashboard' %}" class="btn btn-light btn-sm">
//           <i class="fas fa-arrow-left me-1"></i>Back to Dashboard
//         </a>
//         {% if user.is_authenticated and user.is_staff %}
//           <button type="button" class="btn btn-warning btn-sm edit-theme-btn" 
//                   data-theme-id="{{ selected_theme.pk }}" data-bs-toggle="offcanvas" data-bs-target="#editThreatModal">
//             <i class="fas fa-edit me-1"></i>Edit
//           </button>
//           <button type="button" class="btn btn-light btn-sm text-primary add-event-from-threat" 
//                   data-theme-id="{{ selected_theme.id }}" data-bs-toggle="offcanvas" data-bs-target="#addEventModal">
//             <i class="fas fa-plus me-1"></i>Add Event
//           </button>
//           <button type="button" class="btn btn-{% if selected_theme.is_active %}outline-{% endif %}danger btn-sm archive-theme-btn" 
//                   data-theme-id="{{ selected_theme.id }}" 
//                   data-theme-name="{{ selected_theme.name }}"
//                   data-is-active="{{ selected_theme.is_active|yesno:'true,false' }}">
//             <i class="fas fa-archive me-1"></i>
//             {% if selected_theme.is_active %}Archive{% else %}Restore{% endif %}
//           </button>
//         {% endif %}
//       </div>
//     </div>

//     <div class="card-body">
//       <!-- Threat details -->
//       <div class="theme-details-container mb-4 p-3 bg-light rounded">
//         <h5 class="mb-3 border-bottom pb-2">Threat Details</h5>
//         <div class="row g-3">
//           <div class="col-md-3">
//             <div class="detail-card p-3 h-100 bg-white rounded shadow-sm">
//               <div class="d-flex align-items-center mb-2">
//                 <i class="fas fa-folder-open text-primary me-2"></i>
//                 <strong class="text-muted">Category</strong>
//               </div>
//               <p class="mb-0 fw-bold">{{ selected_theme.category.name }}</p>
//             </div>
//           </div>

//           <div class="col-md-3">
//             <div class="detail-card p-3 h-100 bg-white rounded shadow-sm">
//               <div class="d-flex align-items-center mb-2">
//                 <i class="fas fa-exclamation-triangle text-danger me-2"></i>
//                 <strong class="text-muted">Risk Rating</strong>
//               </div>
//               <span class="badge bg-{% if selected_theme.risk_rating == 'low' %}success{% elif selected_theme.risk_rating == 'medium' %}warning{% elif selected_theme.risk_rating == 'high' %}orange{% else %}danger{% endif %} p-2">
//                 {% if selected_theme.risk_rating == 'low' %}Low
//                 {% elif selected_theme.risk_rating == 'medium' %}Moderate
//                 {% elif selected_theme.risk_rating == 'high' %}High
//                 {% else %}Critical{% endif %}
//               </span>
//             </div>
//           </div>

//           <div class="col-md-3">
//             <div class="detail-card p-3 h-100 bg-white rounded shadow-sm">
//               <div class="d-flex align-items-center mb-2">
//                 <i class="fas fa-clock text-info me-2"></i>
//                 <strong class="text-muted">Onset Timeline</strong>
//               </div>
//               <p class="mb-0 fw-bold">
//                 {% if selected_theme.onset_timeline %}
//                   {{ selected_theme.onset_timeline }}
//                 {% else %}
//                   <span class="text-muted">Not specified</span>
//                 {% endif %}
//               </p>
//             </div>
//           </div>

//           <div class="col-md-3">
//             <div class="detail-card p-3 h-100 bg-white rounded shadow-sm">
//               <div class="d-flex align-items-center mb-2">
//                 <i class="fas fa-calendar-alt text-success me-2"></i>
//                 <strong class="text-muted">Events</strong>
//               </div>
//               <p class="mb-0 fw-bold">{{ selected_theme.events.count }} {{ selected_theme.events.count|pluralize:"event,events" }}</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       <!-- Related Events -->
//       <div class="mt-2">
//         <div class="d-flex justify-content-between align-items-center mb-3">
//           <h5 class="mb-0">Related Events</h5>
//           <small class="text-muted">
//             {{ selected_theme.events.count }} {{ selected_theme.events.count|pluralize:"event,events" }}
//           </small>
//         </div>

//         {% if selected_theme.events.count %}
//           <div class="table-responsive">
//             <table class="table table-hover align-middle">
//               <thead class="table-light">
//                 <tr>
//                   <th>Event Name</th>
//                   <th>Date Identified</th>
//                   <th>Risk Level</th>
//                   <th>Status</th>
//                   {% if user.is_authenticated and user.is_staff %}
//                     <th class="text-end">Actions</th>
//                   {% endif %}
//                 </tr>
//               </thead>
//               <tbody>
//                 {% for event in selected_theme.events.all %}
//                 <tr>
//                   <td>
//                     <a href="{% url 'view_event' event_id=event.pk %}" class="fw-semibold text-dark text-decoration-none">{{ event.name }}</a>
//                   </td>
//                   <td>{{ event.date_identified|date:"Y-m-d" }}</td>
//                   <td>
//                     <span class="badge bg-{% if event.risk_rating == 'LOW' %}success{% elif event.risk_rating == 'MEDIUM' %}warning{% elif event.risk_rating == 'HIGH' %}orange{% else %}danger{% endif %}">
//                       {% if event.risk_rating == 'LOW' %}Low
//                       {% elif event.risk_rating == 'MEDIUM' %}Medium
//                       {% elif event.risk_rating == 'HIGH' %}High
//                       {% else %}Critical{% endif %}
//                     </span>
//                   </td>
//                   <td>
//                     {% if event.is_active %}
//                       <span class="badge bg-success">Active</span>
//                     {% else %}
//                       <span class="badge bg-secondary">Archived</span>
//                     {% endif %}
//                   </td>
//                   {% if user.is_authenticated and user.is_staff %}
//                   <td class="text-end">
//                     <div class="btn-group btn-group-sm" role="group">
//                       <a href="{% url 'view_event' event_id=event.pk %}" class="btn btn-outline-primary" title="View">
//                         <i class="fas fa-eye"></i>
//                       </a>
//                       <button type="button" class="btn btn-outline-warning edit-event-btn" 
//                               data-event-id="{{ event.pk }}" 
//                               data-bs-toggle="offcanvas" 
//                               data-bs-target="#editEventModal"
//                               title="Edit">
//                         <i class="fas fa-edit"></i>
//                       </button>
//                       <button type="button" class="btn btn-outline-danger archive-event-btn" 
//                               data-event-id="{{ event.pk }}" 
//                               data-event-name="{{ event.name }}"
//                               data-is-active="{{ event.is_active|yesno:'true,false' }}"
//                               title="{% if event.is_active %}Archive{% else %}Restore{% endif %}">
//                         <i class="fas fa-archive"></i>
//                       </button>
//                     </div>
//                   </td>
//                   {% endif %}
//                 </tr>
//                 {% endfor %}
//               </tbody>
//             </table>
//           </div>
//         {% else %}
//           <div class="alert alert-info">
//             <i class="fas fa-info-circle me-1"></i>
//             No events have been added to this Threat yet.
//             {% if user.is_authenticated and user.is_staff %}
//               <a href="#" class="alert-link add-event-from-threat" data-theme-id="{{ selected_theme.pk }}" data-bs-toggle="offcanvas" data-bs-target="#addEventModal">Add the first event</a>
//             {% endif %}
//           </div>
//         {% endif %}
//       </div>
//     </div>
//   </div>
//   {% endif %}

//   <!-- ========================= SECTION 2: THREATS LIST ========================= -->
//   {% if not selected_theme %}
//   <div class="card border-0 shadow-sm mb-4 bg-light">
//     <div class="card-header bg-light border-bottom py-3 d-flex justify-content-between align-items-center">
//       <h5 class="mb-0 fw-bold text-dark">
//         <i class="fas fa-exclamation-triangle me-2 text-primary"></i>Threats List
//       </h5>
//       <div class="d-flex align-items-center gap-2">
//         <input type="text" id="threatSearch" class="form-control form-control-sm" placeholder="Search threats..." style="width:180px;">
//         <div class="form-check form-switch me-3">
//           <input class="form-check-input" type="checkbox" id="showArchivedThreats" {% if show_archived_threats %}checked{% endif %}>
//           <label class="form-check-label text-muted small" for="showArchivedThreats">Show Archived</label>
//         </div>
//         {% if user.is_authenticated and user.is_staff %}
//           <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-toggle="offcanvas" data-bs-target="#addThreatModal"
//                   {% if selected_category %}data-category-id="{{ selected_category.id }}"{% endif %}>
//             <i class="fas fa-plus-circle me-1"></i>Add Threat
//           </button>
//           <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-toggle="offcanvas" data-bs-target="#viewAllThreatsModal">
//             <i class="fas fa-eye me-1"></i>View All
//           </button>
//         {% endif %}
//       </div>
//     </div>
//     <div class="card-body bg-white p-0">
//       <table id="threatsTable" class="table table-hover align-middle mb-0">
//         <thead class="table-light">
//           <tr>
//             <th>Events</th>
//             <th>Name</th>
//             <th>Category</th>
//             <th>Onset</th>
//             <th>Risk</th>
//             <th>Status</th>
//             {% if user.is_authenticated and user.is_staff %}
//               <th>Actions</th>
//             {% endif %}
//           </tr>
//         </thead>
//         <tbody>
//           {% for theme in themes_page %}
//           <tr class="theme-row {% if not theme.is_active %}archived{% endif %}" 
//               data-theme-id="{{ theme.id }}" 
//               data-is-active="{{ theme.is_active|yesno:'true,false' }}">
//             <td>{{ theme.events.count|stringformat:"02d" }}</td>
//             <td>
//               <a href="{% url 'dashboard' %}?theme_id={{ theme.id }}{% if selected_category %}&category_id={{ selected_category.id }}{% endif %}" 
//                  class="text-dark text-decoration-none fw-semibold">
//                 {{ theme.name }}
//               </a>
//             </td>
//             <td>{{ theme.category.name }}</td>
//             <td>{{ theme.onset_timeline|default:"<1 year" }}</td>
//             <td>
//               {% if theme.risk_rating == 'low' %}
//                 <span class="badge bg-success">Low</span>
//               {% elif theme.risk_rating == 'medium' %}
//                 <span class="badge bg-warning">Moderate</span>
//               {% elif theme.risk_rating == 'high' %}
//                 <span class="badge bg-orange">High</span>
//               {% elif theme.risk_rating == 'critical' %}
//                 <span class="badge bg-danger">Critical</span>
//               {% endif %}
//             </td>
//             <td>
//               {% if theme.is_active %}
//                 <span class="text-success fw-semibold">Active</span>
//               {% else %}
//                 <span class="text-danger fw-semibold">Inactive</span>
//               {% endif %}
//             </td>
//             {% if user.is_authenticated and user.is_staff %}
//             <td>
//               <div class="dropdown">
//                 <button class="btn btn-sm btn-link text-muted p-0" data-bs-toggle="dropdown">
//                   <i class="fas fa-ellipsis-v"></i>
//                 </button>
//                 <ul class="dropdown-menu dropdown-menu-end shadow-sm">
//                   <li>
//                     <button class="dropdown-item view-theme-details" data-theme-id="{{ theme.id }}">
//                       <i class="fas fa-eye me-2"></i>View Details
//                     </button>
//                   </li>
//                   <li>
//                     <a class="dropdown-item add-event-from-threat" href="#" 
//                        data-theme-id="{{ theme.id }}" 
//                        data-bs-toggle="offcanvas" 
//                        data-bs-target="#addEventModal">
//                       <i class="fas fa-plus me-2"></i>Add Event
//                     </a>
//                   </li>
//                   <li>
//                     <button class="dropdown-item edit-theme-btn" 
//                             data-theme-id="{{ theme.id }}" 
//                             data-bs-toggle="offcanvas" 
//                             data-bs-target="#editThreatModal">
//                       <i class="fas fa-edit me-2"></i>Edit
//                     </button>
//                   </li>
//                   <li>
//                     <button class="dropdown-item archive-theme-btn" 
//                             data-theme-id="{{ theme.id }}" 
//                             data-theme-name="{{ theme.name }}"
//                             data-is-active="{{ theme.is_active|yesno:'true,false' }}">
//                       <i class="fas fa-archive me-2"></i>
//                       {% if theme.is_active %}Archive{% else %}Restore{% endif %}
//                     </button>
//                   </li>
//                 </ul>
//               </div>
//             </td>
//             {% endif %}
//           </tr>
//           {% empty %}
//           <tr>
//             <td colspan="{% if user.is_authenticated and user.is_staff %}7{% else %}6{% endif %}" class="text-center py-4 text-muted">
//               <i class="fas fa-inbox me-2"></i>No threats found
//             </td>
//           </tr>
//           {% endfor %}
//         </tbody>
//       </table>
      
//       <!-- Threats Pagination -->
//       {% if themes_page.paginator.num_pages > 1 %}
//       <div class="d-flex justify-content-between align-items-center p-3 border-top">
//         <div class="text-muted small">
//           Showing {{ themes_page.start_index }} - {{ themes_page.end_index }} of {{ themes_page.paginator.count }} threats
//         </div>
//         <nav aria-label="Threats pagination">
//           <ul class="pagination pagination-sm mb-0">
//             {% if themes_page.has_previous %}
//               <li class="page-item">
//                 <a class="page-link" href="?threat_page={{ themes_page.previous_page_number }}{% if events_page.number > 1 %}&event_page={{ events_page.number }}{% endif %}{% if selected_category %}&category_id={{ selected_category.id }}{% endif %}{% if show_archived_threats %}&show_archived_threats=1{% endif %}" aria-label="Previous">
//                   <span aria-hidden="true">&laquo;</span>
//                 </a>
//               </li>
//             {% else %}
//               <li class="page-item disabled">
//                 <a class="page-link" href="#" aria-label="Previous">
//                   <span aria-hidden="true">&laquo;</span>
//                 </a>
//               </li>
//             {% endif %}
            
//             {% for num in themes_page.paginator.page_range %}
//               {% if num == themes_page.number %}
//                 <li class="page-item active"><a class="page-link" href="#">{{ num }}</a></li>
//               {% elif num > themes_page.number|add:'-3' and num < themes_page.number|add:'3' %}
//                 <li class="page-item">
//                   <a class="page-link" href="?threat_page={{ num }}{% if events_page.number > 1 %}&event_page={{ events_page.number }}{% endif %}{% if selected_category %}&category_id={{ selected_category.id }}{% endif %}{% if show_archived_threats %}&show_archived_threats=1{% endif %}">{{ num }}</a>
//                 </li>
//               {% endif %}
//             {% endfor %}
            
//             {% if themes_page.has_next %}
//               <li class="page-item">
//                 <a class="page-link" href="?threat_page={{ themes_page.next_page_number }}{% if events_page.number > 1 %}&event_page={{ events_page.number }}{% endif %}{% if selected_category %}&category_id={{ selected_category.id }}{% endif %}{% if show_archived_threats %}&show_archived_threats=1{% endif %}" aria-label="Next">
//                   <span aria-hidden="true">&raquo;</span>
//                 </a>
//               </li>
//             {% else %}
//               <li class="page-item disabled">
//                 <a class="page-link" href="#" aria-label="Next">
//                   <span aria-hidden="true">&raquo;</span>
//                 </a>
//               </li>
//             {% endif %}
//           </ul>
//         </nav>
//       </div>
//       {% endif %}
//     </div>
//   </div>
//   {% endif %}

//   <!-- ========================= SECTION 3: EVENTS LIST ========================= -->
//   {% if not selected_theme %}
//   <div class="card border-0 shadow-sm bg-light">
//     <div class="card-header bg-light border-bottom py-3 d-flex justify-content-between align-items-center">
//       <h5 class="mb-0 fw-bold text-dark"><i class="fas fa-calendar-alt me-2 text-primary"></i>Event List</h5>
//       <div class="d-flex align-items-center gap-2">
//         <input type="text" id="eventSearch" class="form-control form-control-sm" placeholder="Search events..." style="width:180px;">
//         <div class="form-check form-switch me-3">
//           <input class="form-check-input" type="checkbox" id="showArchivedEvents" {% if show_archived_events %}checked{% endif %}>
//           <label class="form-check-label text-muted small" for="showArchivedEvents">Show Archived</label>
//         </div>
//         {% if user.is_authenticated and user.is_staff %}
//           <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-toggle="offcanvas" data-bs-target="#addEventModal">
//             <i class="fas fa-plus-circle me-1"></i>Add Event
//           </button>
//           <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-toggle="offcanvas" data-bs-target="#viewAllEventsModal">
//             <i class="fas fa-eye me-1"></i>View All
//           </button>
//         {% endif %}
//       </div>
//     </div>
//     <div class="card-body bg-white p-0">
//       <table id="eventsTable" class="table table-hover align-middle mb-0">
//         <thead class="table-light">
//           <tr>
//             <th>Source</th>
//             <th>Event</th>
//             <th>Threat</th>
//             <th>Date Identified</th>
//             <th>Risk</th>
//             <th>Status</th>
//             {% if user.is_authenticated and user.is_staff %}
//               <th>Actions</th>
//             {% endif %}
//           </tr>
//         </thead>
//         <tbody>
//           {% for event in events_page %}
//           <tr class="event-row {% if not event.is_active %}archived{% endif %}" 
//               data-event-id="{{ event.id }}" 
//               data-is-active="{{ event.is_active|yesno:'true,false' }}">
//             <td><i class="fas fa-chevron-right me-1 arrow-icon text-muted"></i>{{ event.sources.first.name|default:"No source" }}</td>
//             <td><strong>{{ event.name }}</strong></td>
//             <td>{{ event.theme.name }}</td>
//             <td>{{ event.date_identified|date:"m-d-Y" }}</td>
//             <td>
//               {% if event.risk_rating == 'LOW' %}
//                 <span class="badge bg-success">Low</span>
//               {% elif event.risk_rating == 'MEDIUM' %}
//                 <span class="badge bg-warning">Medium</span>
//               {% elif event.risk_rating == 'HIGH' %}
//                 <span class="badge bg-orange">High</span>
//               {% elif event.risk_rating == 'CRITICAL' %}
//                 <span class="badge bg-danger">Critical</span>
//               {% endif %}
//             </td>
//             <td>
//               {% if event.is_active %}
//                 <span class="text-success fw-semibold">Active</span>
//               {% else %}
//                 <span class="text-danger fw-semibold">Inactive</span>
//               {% endif %}
//             </td>
//             {% if user.is_authenticated and user.is_staff %}
//             <td>
//               <div class="dropdown">
//                 <button class="btn btn-sm btn-link text-muted p-0" data-bs-toggle="dropdown">
//                   <i class="fas fa-ellipsis-v"></i>
//                 </button>
//                 <ul class="dropdown-menu dropdown-menu-end shadow-sm">
//                   <li>
//                     <a class="dropdown-item" href="{% url 'add_source' event_pk=event.id %}">
//                       <i class="fas fa-paperclip me-2"></i>Add Source
//                     </a>
//                   </li>
//                   <li>
//                     <a class="dropdown-item" href="{% url 'view_event' event_id=event.id %}">
//                       <i class="fas fa-eye me-2"></i>Details
//                     </a>
//                   </li>
//                   <li>
//                     <button class="dropdown-item edit-event-btn" 
//                             data-event-id="{{ event.id }}" 
//                             data-bs-toggle="offcanvas" 
//                             data-bs-target="#editEventModal">
//                       <i class="fas fa-edit me-2"></i>Edit
//                     </button>
//                   </li>
//                   <li>
//                     <button class="dropdown-item archive-event-btn" 
//                             data-event-id="{{ event.id }}" 
//                             data-event-name="{{ event.name }}"
//                             data-is-active="{{ event.is_active|yesno:'true,false' }}">
//                       <i class="fas fa-archive me-2"></i>
//                       {% if event.is_active %}Archive{% else %}Restore{% endif %}
//                     </button>
//                   </li>
//                 </ul>
//               </div>
//             </td>
//             {% endif %}
//           </tr>
//           {% empty %}
//           <tr>
//             <td colspan="{% if user.is_authenticated and user.is_staff %}7{% else %}6{% endif %}" class="text-center py-4 text-muted">
//               <i class="fas fa-inbox me-2"></i>No events found
//             </td>
//           </tr>
//           {% endfor %}
//         </tbody>
//       </table>
      
//       <!-- Events Pagination -->
//       {% if events_page.paginator.num_pages > 1 %}
//       <div class="d-flex justify-content-between align-items-center p-3 border-top">
//         <div class="text-muted small">
//           Showing {{ events_page.start_index }} - {{ events_page.end_index }} of {{ events_page.paginator.count }} events
//         </div>
//         <nav aria-label="Events pagination">
//           <ul class="pagination pagination-sm mb-0">
//             {% if events_page.has_previous %}
//               <li class="page-item">
//                 <a class="page-link" href="?event_page={{ events_page.previous_page_number }}{% if themes_page.number > 1 %}&threat_page={{ themes_page.number }}{% endif %}{% if selected_category %}&category_id={{ selected_category.id }}{% endif %}{% if show_archived_events %}&show_archived_events=1{% endif %}" aria-label="Previous">
//                   <span aria-hidden="true">&laquo;</span>
//                 </a>
//               </li>
//             {% else %}
//               <li class="page-item disabled">
//                 <a class="page-link" href="#" aria-label="Previous">
//                   <span aria-hidden="true">&laquo;</span>
//                 </a>
//               </li>
//             {% endif %}
            
//             {% for num in events_page.paginator.page_range %}
//               {% if num == events_page.number %}
//                 <li class="page-item active"><a class="page-link" href="#">{{ num }}</a></li>
//               {% elif num > events_page.number|add:'-3' and num < events_page.number|add:'3' %}
//                 <li class="page-item">
//                   <a class="page-link" href="?event_page={{ num }}{% if themes_page.number > 1 %}&threat_page={{ themes_page.number }}{% endif %}{% if selected_category %}&category_id={{ selected_category.id }}{% endif %}{% if show_archived_events %}&show_archived_events=1{% endif %}">{{ num }}</a>
//                 </li>
//               {% endif %}
//             {% endfor %}
            
//             {% if events_page.has_next %}
//               <li class="page-item">
//                 <a class="page-link" href="?event_page={{ events_page.next_page_number }}{% if themes_page.number > 1 %}&threat_page={{ themes_page.number }}{% endif %}{% if selected_category %}&category_id={{ selected_category.id }}{% endif %}{% if show_archived_events %}&show_archived_events=1{% endif %}" aria-label="Next">
//                   <span aria-hidden="true">&raquo;</span>
//                 </a>
//               </li>
//             {% else %}
//               <li class="page-item disabled">
//                 <a class="page-link" href="#" aria-label="Next">
//                   <span aria-hidden="true">&raquo;</span>
//                 </a>
//               </li>
//             {% endif %}
//           </ul>
//         </nav>
//       </div>
//       {% endif %}
//     </div>
//   </div>
//   {% endif %}

// </div>

// <!-- ========================= MODALS SECTION ========================= -->

// <!-- Confirmation Modal -->
// <div class="modal fade" id="confirmationModal" tabindex="-1" aria-labelledby="confirmationModalLabel" aria-hidden="true">
//   <div class="modal-dialog modal-dialog-centered">
//     <div class="modal-content">
//       <div class="modal-header">
//         <h5 class="modal-title" id="confirmationModalLabel">Confirm Action</h5>
//         <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
//       </div>
//       <div class="modal-body" id="confirmationModalBody">
//         <!-- Content will be filled dynamically -->
//       </div>
//       <div class="modal-footer">
//         <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No, Cancel</button>
//         <button type="button" class="btn btn-primary" id="confirmActionBtn">Yes, Continue</button>
//       </div>
//     </div>
//   </div>
// </div>

// <!-- Add Threat Modal -->
// <div class="offcanvas offcanvas-end" tabindex="-1" id="addThreatModal" aria-labelledby="addThreatModalLabel">
//   <div class="offcanvas-header border-bottom">
//     <h5 class="offcanvas-title fw-bold text-dark" id="addThreatModalLabel">
//       <i class="fas fa-plus-circle me-2" style="color:#f26522;"></i>Add Threat
//     </h5>
//     <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
//   </div>
//   <div class="offcanvas-body">
//     <form method="post" action="{% url 'add_theme' %}" id="addThreatForm" novalidate>
//       {% csrf_token %}
      
//       <!-- Basic Information Card -->
//       <div class="card border-0 shadow-sm mb-4">
//         <div class="card-header bg-light">
//           <h6 class="mb-0 fw-bold text-dark">
//             <i class="fas fa-info-circle me-2 text-primary"></i>Basic Information
//           </h6>
//         </div>
//         <div class="card-body">
//           <!-- Category Field -->
//           <div class="mb-3">
//             <label for="category" class="form-label fw-semibold">
//               Category <span class="text-danger">*</span>
//             </label>
//             <select class="form-select" id="category" name="category" required>
//               <option value="">Select category</option>
//               {% for category in categories %}
//                 <option value="{{ category.id }}" 
//                         {% if selected_category and selected_category.id == category.id %}selected{% endif %}>
//                   {{ category.name }}
//                 </option>
//               {% endfor %}
//             </select>
//           </div>
          
//           <!-- Name Field -->
//           <div class="mb-3">
//             <label for="name" class="form-label fw-semibold">
//               Name <span class="text-muted small float-end" id="nameCounter">0/30</span>
//             </label>
//             <input type="text" 
//                    class="form-control" 
//                    id="name" 
//                    name="name" 
//                    placeholder="Enter threat name" 
//                    maxlength="30"
//                    required>
//             <div class="form-text text-muted">
//               Max 30 characters
//             </div>
//           </div>
//         </div>
//       </div>
      
//       <!-- Classification Card -->
//       <div class="card border-0 shadow-sm mb-4">
//         <div class="card-header bg-light">
//           <h6 class="mb-0 fw-bold text-dark">
//             <i class="fas fa-tags me-2 text-primary"></i>Classification
//           </h6>
//         </div>
//         <div class="card-body">
//           <!-- Risk Rating -->
//           <div class="mb-4">
//             <label class="form-label fw-semibold">
//               Risk Rating <span class="text-danger">*</span>
//             </label>
            
//             <!-- Hidden select for form submission -->
//             <select name="risk_rating" class="form-select risk-rating d-none" required>
//               <option value="low">Low</option>
//               <option value="medium">Moderate</option>
//               <option value="high">High</option>
//               <option value="critical">Critical</option>
//             </select>
            
//             <!-- Risk Cards -->
//             <div class="risk-rating-container mt-2" id="risk-cards">
//               <div class="row g-2">
//                 <div class="col-6">
//                   <div class="risk-card" data-value="low">
//                     <div class="card h-100 risk-card-inner">
//                       <div class="card-body text-center p-2">
//                         <span class="badge bg-success mb-1">Low</span>
//                         <small class="text-muted d-block">Minimal impact</small>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//                 <div class="col-6">
//                   <div class="risk-card" data-value="medium">
//                     <div class="card h-100 risk-card-inner">
//                       <div class="card-body text-center p-2">
//                         <span class="badge bg-warning mb-1">Moderate</span>
//                         <small class="text-muted d-block">Moderate impact</small>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//                 <div class="col-6">
//                   <div class="risk-card" data-value="high">
//                     <div class="card h-100 risk-card-inner">
//                       <div class="card-body text-center p-2">
//                         <span class="badge bg-orange mb-1">High</span>
//                         <small class="text-muted d-block">Significant impact</small>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//                 <div class="col-6">
//                   <div class="risk-card" data-value="critical">
//                     <div class="card h-100 risk-card-inner">
//                       <div class="card-body text-center p-2">
//                         <span class="badge bg-danger mb-1">Critical</span>
//                         <small class="text-muted d-block">Severe impact</small>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
              
//               <div id="risk-error" class="invalid-feedback d-block" style="display:none;">
//                 Please select a Risk Rating
//               </div>
//             </div>
//           </div>
          
//           <!-- Onset Timeline -->
//           <div class="mb-3">
//             <label for="onset_timeline" class="form-label fw-semibold">
//               Onset Timeline <span class="text-danger">*</span>
//             </label>
//             <select class="form-select" 
//                     id="onset_timeline" name="onset_timeline" required>
//               <option value="">Select</option>
//               <option value="<1 year">&lt;1 year</option>
//               <option value="1-2 years">1-2 years</option>
//               <option value="2-5 years">2-5 years</option>
//             </select>
//           </div>
//         </div>
//       </div>
      
//       <!-- Form Actions -->
//       <div class="d-flex justify-content-between align-items-center border-top pt-3 mt-4">
//         <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="offcanvas">
//           <i class="fas fa-times me-2"></i>Cancel
//         </button>
//         <button type="submit" class="btn btn-primary" style="background-color: #f26522; border-color: #f26522;">
//           <i class="fas fa-save me-2"></i>Save Threat
//         </button>
//       </div>
//     </form>
//   </div>
// </div>

// <!-- Add Event Modal (simplified version) -->
// <div class="offcanvas offcanvas-end" tabindex="-1" id="addEventModal" aria-labelledby="addEventModalLabel">
//   <div class="offcanvas-header border-bottom">
//     <h5 class="offcanvas-title fw-bold text-dark" id="addEventModalLabel">
//       <i class="fas fa-plus-circle me-2" style="color:#f26522;"></i>Add Event
//     </h5>
//     <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
//   </div>
//   <div class="offcanvas-body">
//     <p>Event form would go here...</p>
//   </div>
// </div>

// <!-- Edit Threat Modal (simplified version) -->
// <div class="offcanvas offcanvas-end" tabindex="-1" id="editThreatModal" aria-labelledby="editThreatModalLabel">
//   <div class="offcanvas-header border-bottom">
//     <h5 class="offcanvas-title fw-bold text-dark" id="editThreatModalLabel">
//       <i class="fas fa-edit me-2" style="color:#f26522;"></i>Edit Threat
//     </h5>
//     <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
//   </div>
//   <div class="offcanvas-body">
//     <p>Edit threat form would go here...</p>
//   </div>
// </div>

// <!-- Edit Event Modal (simplified version) -->
// <div class="offcanvas offcanvas-end" tabindex="-1" id="editEventModal" aria-labelledby="editEventModalLabel">
//   <div class="offcanvas-header border-bottom">
//     <h5 class="offcanvas-title fw-bold text-dark" id="editEventModalLabel">
//       <i class="fas fa-edit me-2" style="color:#f26522;"></i>Edit Event
//     </h5>
//     <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
//   </div>
//   <div class="offcanvas-body">
//     <p>Edit event form would go here...</p>
//   </div>
// </div>

// <!-- View All Modals (simplified versions) -->
// <div class="offcanvas offcanvas-end" tabindex="-1" id="viewAllThreatsModal" aria-labelledby="viewAllThreatsModalLabel">
//   <div class="offcanvas-header border-bottom">
//     <h5 class="offcanvas-title fw-bold text-dark" id="viewAllThreatsModalLabel">
//       <i class="fas fa-eye me-2" style="color:#f26522;"></i>All Threats
//     </h5>
//     <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
//   </div>
//   <div class="offcanvas-body">
//     <p>All threats list would go here...</p>
//   </div>
// </div>

// <div class="offcanvas offcanvas-end" tabindex="-1" id="viewAllEventsModal" aria-labelledby="viewAllEventsModalLabel">
//   <div class="offcanvas-header border-bottom">
//     <h5 class="offcanvas-title fw-bold text-dark" id="viewAllEventsModalLabel">
//       <i class="fas fa-eye me-2" style="color:#f26522;"></i>All Events
//     </h5>
//     <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
//   </div>
//   <div class="offcanvas-body">
//     <p>All events list would go here...</p>
//   </div>
// </div>

// <!-- ========================= STYLES ========================= -->
// <style>
// /* ========================= VARIABLES & THEME ========================= */
// :root {
//   --primary-color: #f26522;
//   --primary-hover: #e55a1a;
//   --primary-light: rgba(242, 101, 34, 0.1);
//   --primary-lighter: rgba(242, 101, 34, 0.05);
//   --success-color: #28a745;
//   --success-light: rgba(40, 167, 69, 0.1);
//   --warning-color: #ffc107;
//   --warning-light: rgba(255, 193, 7, 0.1);
//   --danger-color: #dc3545;
//   --danger-light: rgba(220, 53, 69, 0.1);
//   --info-color: #17a2b8;
//   --info-light: rgba(23, 162, 184, 0.1);
//   --light-color: #f8f9fa;
//   --lighter-color: #fcfcfc;
//   --dark-color: #343a40;
//   --darker-color: #212529;
//   --muted-color: #6c757d;
//   --border-color: #dee2e6;
//   --border-light: #e9ecef;
//   --shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
//   --shadow-md: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
//   --shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175);
//   --transition: all 0.2s ease-in-out;
//   --transition-slow: all 0.3s ease-in-out;
//   --border-radius: 0.375rem;
//   --border-radius-sm: 0.25rem;
//   --border-radius-lg: 0.5rem;
//   --border-radius-xl: 1rem;
// }

// /* ========================= BASE STYLES ========================= */
// .dashboard-container {
//   font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//   line-height: 1.6;
//   color: var(--dark-color);
//   background-color: #f8f9fa;
// }

// /* ========================= ACCESSIBILITY ========================= */
// .sr-only {
//   position: absolute;
//   width: 1px;
//   height: 1px;
//   padding: 0;
//   margin: -1px;
//   overflow: hidden;
//   clip: rect(0, 0, 0, 0);
//   white-space: nowrap;
//   border: 0;
// }

// .sr-only-focusable:focus,
// .sr-only-focusable:active {
//   position: static;
//   width: auto;
//   height: auto;
//   overflow: visible;
//   clip: auto;
//   white-space: normal;
// }

// /* Skip link for keyboard navigation */
// .skip-link {
//   position: absolute;
//   top: -40px;
//   left: 6px;
//   background: var(--primary-color);
//   color: white;
//   padding: 8px 16px;
//   text-decoration: none;
//   border-radius: var(--border-radius);
//   z-index: 10000;
//   transition: var(--transition);
//   font-weight: 600;
// }

// .skip-link:focus {
//   top: 6px;
//   outline: 2px solid var(--primary-color);
//   outline-offset: 2px;
// }

// /* Focus styles for better accessibility */
// .btn:focus,
// .form-control:focus,
// .form-select:focus,
// .form-check-input:focus,
// .page-link:focus {
//   box-shadow: 0 0 0 0.2rem rgba(242, 101, 34, 0.25);
//   border-color: var(--primary-color);
//   outline: none;
// }

// /* High contrast mode support */
// @media (prefers-contrast: high) {
//   :root {
//     --primary-color: #0044cc;
//     --border-color: #000000;
//   }
  
//   .btn {
//     border-width: 2px;
//   }
  
//   .card {
//     border-width: 2px;
//   }
// }

// /* Reduced motion support */
// @media (prefers-reduced-motion: reduce) {
//   *,
//   *::before,
//   *::after {
//     animation-duration: 0.01ms !important;
//     animation-iteration-count: 1 !important;
//     transition-duration: 0.01ms !important;
//     scroll-behavior: auto !important;
//   }
// }

// /* ========================= TYPOGRAPHY & COLORS ========================= */
// .text-orange { 
//   color: var(--primary-color) !important; 
// }

// .bg-orange { 
//   background-color: var(--primary-color) !important; 
// }

// .bg-orange-light {
//   background-color: var(--primary-light) !important;
// }

// .bg-orange-lighter {
//   background-color: var(--primary-lighter) !important;
// }

// .risk-chip { 
//   font-size: 0.85em; 
//   font-weight: 600; 
//   display: inline-flex; 
//   align-items: center; 
//   gap: 0.25rem;
// }

// /* ========================= CARD STYLES ========================= */
// .card {
//   border: 1px solid var(--border-color);
//   box-shadow: var(--shadow);
//   transition: var(--transition);
//   background: white;
// }

// .card:hover {
//   box-shadow: var(--shadow-md);
// }

// .card-header {
//   background: linear-gradient(135deg, var(--light-color) 0%, #fff 100%);
//   border-bottom: 1px solid var(--border-color);
//   font-weight: 600;
// }

// .card-subheader {
//   background: var(--light-color) !important;
//   border-left: 4px solid var(--info-color);
//   font-weight: 600;
// }

// .detail-card {
//   transition: transform 0.2s ease, box-shadow 0.2s ease;
//   border: 1px solid var(--border-light);
//   background: white;
// }

// .detail-card:hover {
//   transform: translateY(-2px);
//   box-shadow: var(--shadow-md) !important;
// }

// .theme-details-container {
//   background: linear-gradient(135deg, #f8f9fa 0%, #f0f4f8 100%) !important;
//   border: 1px solid var(--border-light);
// }

// /* ========================= TABLE STYLES ========================= */
// .table {
//   --bs-table-bg: transparent;
//   --bs-table-striped-bg: rgba(0, 0, 0, 0.02);
//   --bs-table-hover-bg: rgba(0, 0, 0, 0.04);
//   margin-bottom: 0;
// }

// .table > :not(caption) > * > * {
//   padding: 0.75rem 0.5rem;
//   border-bottom-color: var(--border-color);
//   vertical-align: middle;
// }

// .table-hover > tbody > tr:hover {
//   --bs-table-accent-bg: rgba(242, 101, 34, 0.04);
// }

// .table th {
//   font-weight: 600;
//   color: var(--dark-color);
//   border-bottom: 2px solid var(--border-color);
//   background-color: var(--light-color);
// }

// .table-light {
//   --bs-table-bg: var(--light-color);
//   --bs-table-striped-bg: rgba(0, 0, 0, 0.05);
// }

// /* Archived rows styling */
// .archived {
//   opacity: 0.7;
//   background-color: var(--light-color) !important;
// }

// .archived td {
//   color: var(--muted-color) !important;
// }

// .archived .badge {
//   opacity: 0.8;
// }

// /* Table responsive enhancements */
// .table-responsive {
//   overflow-x: auto;
//   -webkit-overflow-scrolling: touch;
// }

// .table-responsive::-webkit-scrollbar {
//   height: 8px;
// }

// .table-responsive::-webkit-scrollbar-track {
//   background: var(--light-color);
//   border-radius: 4px;
// }

// .table-responsive::-webkit-scrollbar-thumb {
//   background: #c1c1c1;
//   border-radius: 4px;
// }

// .table-responsive::-webkit-scrollbar-thumb:hover {
//   background: #a8a8a8;
// }

// /* ========================= BUTTON STYLES ========================= */
// .btn {
//   font-weight: 500;
//   border-radius: var(--border-radius);
//   transition: var(--transition);
//   display: inline-flex;
//   align-items: center;
//   justify-content: center;
//   gap: 0.5rem;
//   border: 1px solid transparent;
//   cursor: pointer;
// }

// .btn-primary {
//   background-color: var(--primary-color);
//   border-color: var(--primary-color);
//   color: white;
// }

// .btn-primary:hover,
// .btn-primary:focus {
//   background-color: var(--primary-hover);
//   border-color: var(--primary-hover);
//   transform: translateY(-1px);
//   box-shadow: var(--shadow);
// }

// .btn-outline-primary {
//   color: var(--primary-color);
//   border-color: var(--primary-color);
//   background: transparent;
// }

// .btn-outline-primary:hover,
// .btn-outline-primary:focus {
//   background-color: var(--primary-color);
//   border-color: var(--primary-color);
//   color: white;
//   transform: translateY(-1px);
// }

// .btn-square {
//   width: 36px;
//   height: 36px;
//   padding: 0;
//   display: inline-flex;
//   align-items: center;
//   justify-content: center;
//   border-width: 1px;
//   border-radius: var(--border-radius-lg);
//   transition: var(--transition);
// }

// .btn-square:hover {
//   transform: translateY(-1px);
//   box-shadow: var(--shadow);
// }

// .btn-loading {
//   position: relative;
//   color: transparent !important;
//   pointer-events: none;
// }

// .btn-loading::after {
//   content: '';
//   position: absolute;
//   width: 16px;
//   height: 16px;
//   border: 2px solid transparent;
//   border-top: 2px solid currentColor;
//   border-radius: 50%;
//   animation: spin 1s linear infinite;
// }

// @keyframes spin {
//   0% { transform: rotate(0deg); }
//   100% { transform: rotate(360deg); }
// }

// .btn-group-sm > .btn {
//   border-radius: var(--border-radius-sm);
// }

// /* ========================= BADGE STYLES ========================= */
// .badge {
//   font-size: 0.75em;
//   font-weight: 600;
//   letter-spacing: 0.02em;
//   padding: 0.35em 0.65em;
//   border-radius: var(--border-radius-sm);
// }

// .bg-orange {
//   background-color: var(--primary-color) !important;
// }

// .bg-success {
//   background-color: var(--success-color) !important;
// }

// .bg-warning {
//   background-color: var(--warning-color) !important;
//   color: var(--dark-color) !important;
// }

// .bg-danger {
//   background-color: var(--danger-color) !important;
// }

// .bg-secondary {
//   background-color: var(--muted-color) !important;
// }

// /* ========================= FORM STYLES ========================= */
// .form-label {
//   color: var(--dark-color);
//   font-weight: 600;
//   margin-bottom: 0.5rem;
//   display: block;
// }

// .form-control, 
// .form-select {
//   border-radius: var(--border-radius);
//   border: 1px solid var(--border-color);
//   transition: var(--transition);
//   background-color: white;
// }

// .form-control:focus, 
// .form-select:focus {
//   border-color: var(--primary-color);
//   box-shadow: 0 0 0 0.2rem rgba(242, 101, 34, 0.25);
//   background-color: white;
// }

// .form-text {
//   font-size: 0.875rem;
//   color: var(--muted-color);
//   margin-top: 0.25rem;
// }

// .form-check-input {
//   transition: var(--transition);
// }

// .form-check-input:focus {
//   border-color: var(--primary-color);
//   box-shadow: 0 0 0 0.2rem rgba(242, 101, 34, 0.25);
// }

// .form-check-input:checked {
//   background-color: var(--primary-color);
//   border-color: var(--primary-color);
// }

// .form-switch .form-check-input:focus {
//   background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23f26522'/%3e%3c/svg%3e");
// }

// .form-switch .form-check-input:checked {
//   background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e");
// }

// /* Input groups */
// .input-group-text {
//   background-color: var(--light-color);
//   border: 1px solid var(--border-color);
//   color: var(--muted-color);
// }

// .input-group .form-control:focus {
//   z-index: 3;
// }

// /* Validation states */
// .was-validated .form-control:valid,
// .was-validated .form-select:valid {
//   border-color: var(--success-color);
//   background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%2328a745' d='M2.3 6.73.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e");
//   background-repeat: no-repeat;
//   background-position: right calc(0.375em + 0.1875rem) center;
//   background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
// }

// .was-validated .form-control:invalid,
// .was-validated .form-select:invalid {
//   border-color: var(--danger-color);
//   background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23dc3545'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath d='m5.8 3.6.4.4.4-.4'/%3e%3cpath d='M6 7v1'/%3e%3c/svg%3e");
//   background-repeat: no-repeat;
//   background-position: right calc(0.375em + 0.1875rem) center;
//   background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
// }

// .invalid-feedback {
//   display: none;
//   width: 100%;
//   margin-top: 0.25rem;
//   font-size: 0.875rem;
//   color: var(--danger-color);
// }

// .is-invalid {
//   border-color: var(--danger-color) !important;
// }

// .is-invalid ~ .invalid-feedback {
//   display: block;
// }

// /* ========================= RISK CARDS STYLES ========================= */
// .risk-card, 
// .edit-risk-card { 
//   cursor: pointer; 
//   outline: none;
// }

// .risk-card-inner, 
// .edit-risk-card-inner { 
//   border: 2px solid transparent; 
//   transition: var(--transition); 
//   background-color: #fff;
//   border-radius: var(--border-radius);
//   height: 100%;
// }

// .risk-card-inner:hover, 
// .edit-risk-card-inner:hover { 
//   border-color: var(--border-color); 
//   transform: translateY(-2px); 
//   box-shadow: var(--shadow);
// }

// .risk-card-inner.selected, 
// .edit-risk-card-inner.selected { 
//   border-color: var(--primary-color); 
//   background-color: var(--primary-lighter); 
//   box-shadow: var(--shadow);
// }

// .risk-card[role="radio"]:focus .risk-card-inner,
// .edit-risk-card[role="radio"]:focus .edit-risk-card-inner {
//   border-color: var(--primary-color);
//   box-shadow: 0 0 0 0.2rem rgba(242, 101, 34, 0.25);
// }

// /* Risk tiles */
// .risk-rating-container {
//   display: flex;
//   flex-direction: column;
//   gap: 8px;
//   margin-top: 10px;
// }

// .risk-item {
//   display: flex;
//   align-items: center;
//   padding: 12px 16px;
//   border: 1px solid var(--border-color);
//   border-radius: var(--border-radius);
//   cursor: pointer;
//   transition: var(--transition);
//   background: white;
//   outline: none;
// }

// .risk-item:hover {
//   background: var(--light-color);
//   transform: translateY(-1px);
//   box-shadow: var(--shadow);
// }

// .risk-item.selected {
//   background: var(--light-color);
//   border-color: var(--primary-color);
//   box-shadow: var(--shadow);
// }

// .risk-item:focus {
//   border-color: var(--primary-color);
//   box-shadow: 0 0 0 0.2rem rgba(242, 101, 34, 0.25);
// }

// .rating-display {
//   display: flex;
//   align-items: center;
//   gap: 8px;
// }

// .risk-color {
//   width: 16px;
//   height: 16px;
//   border-radius: 50%;
//   display: inline-block;
//   border: 2px solid white;
//   box-shadow: 0 0 0 1px var(--border-color);
// }

// .risk-low { background: var(--success-color); }
// .risk-medium { background: var(--warning-color); }
// .risk-high { background: var(--primary-color); }
// .risk-critical { background: var(--danger-color); }

// .risk-tiles-invalid {
//   border: 1px dashed var(--danger-color);
//   border-radius: var(--border-radius);
//   padding: 8px;
//   background-color: var(--danger-light);
// }

// /* ========================= OFFCANVAS STYLES ========================= */
// .offcanvas {
//   background: white;
//   box-shadow: var(--shadow-lg);
// }

// .offcanvas-header {
//   padding: 1rem 1.5rem;
//   border-bottom: 1px solid var(--border-color);
//   background: var(--light-color);
// }

// .offcanvas-title {
//   font-weight: 700;
//   color: var(--dark-color);
// }

// .offcanvas-body {
//   padding: 1.5rem;
//   background: white;
// }

// .offcanvas-backdrop {
//   background-color: rgba(0, 0, 0, 0.5);
// }

// /* Specific offcanvas widths */
// #viewAllThreatsModal,
// #viewAllEventsModal {
//   width: 1200px !important;
// }

// #addEventModal,
// #editEventModal {
//   width: 900px !important;
// }

// #themeDetailOffcanvas {
//   width: 800px !important;
// }

// /* Offcanvas responsive behavior */
// @media (max-width: 1199.98px) {
//   #viewAllThreatsModal,
//   #viewAllEventsModal {
//     width: 95% !important;
//     max-width: 1200px;
//   }
// }

// @media (max-width: 899.98px) {
//   #addEventModal,
//   #editEventModal {
//     width: 95% !important;
//     max-width: 900px;
//   }
// }

// @media (max-width: 799.98px) {
//   #themeDetailOffcanvas {
//     width: 95% !important;
//     max-width: 800px;
//   }
// }

// /* ========================= PAGINATION STYLES ========================= */
// .pagination {
//   gap: 4px;
//   margin-bottom: 0;
// }

// .page-link {
//   color: var(--muted-color);
//   border-radius: var(--border-radius);
//   border: 1px solid var(--border-color);
//   transition: var(--transition);
//   padding: 0.375rem 0.75rem;
//   font-weight: 500;
// }

// .page-item.active .page-link {
//   background-color: var(--primary-color);
//   border-color: var(--primary-color);
//   color: white;
// }

// .page-link:hover {
//   color: var(--primary-color);
//   background-color: var(--light-color);
//   border-color: var(--border-color);
//   text-decoration: none;
// }

// .page-link:focus {
//   box-shadow: 0 0 0 0.2rem rgba(242, 101, 34, 0.25);
//   background-color: var(--light-color);
// }

// .page-item.disabled .page-link {
//   color: var(--muted-color);
//   background-color: var(--light-color);
//   border-color: var(--border-color);
//   opacity: 0.6;
// }

// /* ========================= ANIMATIONS & TRANSITIONS ========================= */
// .fade-in {
//   animation: fadeIn 0.3s ease-in;
// }

// @keyframes fadeIn {
//   from { 
//     opacity: 0; 
//     transform: translateY(10px); 
//   }
//   to { 
//     opacity: 1; 
//     transform: translateY(0); 
//   }
// }

// .slide-in-left {
//   animation: slideInLeft 0.3s ease-out;
// }

// @keyframes slideInLeft {
//   from { 
//     transform: translateX(-100%); 
//     opacity: 0; 
//   }
//   to { 
//     transform: translateX(0); 
//     opacity: 1; 
//   }
// }

// .slide-in-right {
//   animation: slideInRight 0.3s ease-out;
// }

// @keyframes slideInRight {
//   from { 
//     transform: translateX(100%); 
//     opacity: 0; 
//   }
//   to { 
//     transform: translateX(0); 
//     opacity: 1; 
//   }
// }

// /* Shake animation for errors */
// @keyframes shake {
//   0%, 100% { transform: translateX(0); }
//   10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
//   20%, 40%, 60%, 80% { transform: translateX(5px); }
// }

// .shake {
//   animation: shake 0.5s ease-in-out;
// }

// /* Pulse animation for loading */
// @keyframes pulse {
//   0% { opacity: 1; }
//   50% { opacity: 0.5; }
//   100% { opacity: 1; }
// }

// .pulse {
//   animation: pulse 2s infinite;
// }

// /* ========================= LOADING STATES ========================= */
// .loading-overlay {
//   position: absolute;
//   top: 0;
//   left: 0;
//   right: 0;
//   bottom: 0;
//   background: rgba(255, 255, 255, 0.9);
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   z-index: 1000;
//   border-radius: var(--border-radius);
//   backdrop-filter: blur(2px);
// }

// .loading-spinner {
//   width: 2rem;
//   height: 2rem;
//   color: var(--primary-color);
// }

// .loading-text {
//   margin-top: 1rem;
//   color: var(--muted-color);
//   font-size: 0.875rem;
// }

// /* Skeleton loading */
// .skeleton {
//   background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
//   background-size: 200% 100%;
//   animation: loading 1.5s infinite;
//   border-radius: var(--border-radius);
//   color: transparent;
// }

// .skeleton-text {
//   height: 1rem;
//   margin-bottom: 0.5rem;
// }

// .skeleton-title {
//   height: 1.5rem;
//   margin-bottom: 1rem;
// }

// .skeleton-button {
//   height: 2.5rem;
//   width: 100px;
// }

// @keyframes loading {
//   0% { background-position: 200% 0; }
//   100% { background-position: -200% 0; }
// }

// /* ========================= DROPDOWN STYLES ========================= */
// .dropdown-menu {
//   border: 1px solid var(--border-color);
//   box-shadow: var(--shadow-md);
//   border-radius: var(--border-radius);
//   padding: 0.5rem;
//   min-width: 200px;
// }

// .dropdown-item {
//   padding: 0.5rem 1rem;
//   border-radius: var(--border-radius-sm);
//   transition: var(--transition);
//   color: var(--dark-color);
//   display: flex;
//   align-items: center;
//   gap: 0.5rem;
// }

// .dropdown-item:hover,
// .dropdown-item:focus {
//   background-color: var(--primary-light);
//   color: var(--dark-color);
// }

// .dropdown-item.active {
//   background-color: var(--primary-color);
//   color: white;
// }

// .dropdown-toggle::after {
//   margin-left: 0.5rem;
// }

// /* ========================= ALERT STYLES ========================= */
// .alert {
//   border: 1px solid transparent;
//   border-radius: var(--border-radius);
//   padding: 1rem 1.25rem;
//   margin-bottom: 1rem;
// }

// .alert-info {
//   background-color: var(--info-light);
//   border-color: var(--info-color);
//   color: var(--dark-color);
// }

// .alert-success {
//   background-color: var(--success-light);
//   border-color: var(--success-color);
//   color: var(--dark-color);
// }

// .alert-warning {
//   background-color: var(--warning-light);
//   border-color: var(--warning-color);
//   color: var(--dark-color);
// }

// .alert-danger {
//   background-color: var(--danger-light);
//   border-color: var(--danger-color);
//   color: var(--dark-color);
// }

// .alert-link {
//   font-weight: 600;
//   text-decoration: underline;
// }

// .alert-link:hover {
//   text-decoration: none;
// }

// /* ========================= MODAL STYLES ========================= */
// .modal-content {
//   border: none;
//   border-radius: var(--border-radius-lg);
//   box-shadow: var(--shadow-lg);
// }

// .modal-header {
//   border-bottom: 1px solid var(--border-color);
//   padding: 1.25rem 1.5rem;
// }

// .modal-footer {
//   border-top: 1px solid var(--border-color);
//   padding: 1.25rem 1.5rem;
// }

// .modal-body {
//   padding: 1.5rem;
// }

// .modal-backdrop {
//   background-color: rgba(0, 0, 0, 0.5);
// }

// .modal-backdrop.show {
//   opacity: 0.5;
// }

// /* ========================= ICON STYLES ========================= */
// .arrow-icon {
//   transition: transform 0.25s ease;
//   font-size: 0.75rem;
// }

// .arrow-icon.rotate {
//   transform: rotate(90deg);
//   color: var(--primary-color) !important;
// }

// .fas, .far, .fab {
//   width: 1em;
//   text-align: center;
// }

// /* ========================= RESPONSIVE DESIGN ========================= */
// @media (max-width: 768px) {
//   .offcanvas {
//     width: 100% !important;
//   }
  
//   .card-header .d-flex {
//     flex-direction: column;
//     gap: 0.5rem;
//     align-items: flex-start !important;
//   }
  
//   .table-responsive {
//     font-size: 0.875rem;
//   }
  
//   .btn-group-sm > .btn {
//     padding: 0.25rem 0.5rem;
//     font-size: 0.75rem;
//   }
  
//   .risk-rating-container {
//     flex-direction: row;
//     flex-wrap: wrap;
//   }
  
//   .risk-item {
//     flex: 1;
//     min-width: 120px;
//     justify-content: center;
//   }
  
//   .taxonomy-section {
//     margin-bottom: 1rem;
//   }
  
//   .detail-card {
//     margin-bottom: 0.5rem;
//   }
  
//   .pagination {
//     flex-wrap: wrap;
//     justify-content: center;
//   }
  
//   .page-item .page-link {
//     padding: 0.25rem 0.5rem;
//     font-size: 0.875rem;
//   }
// }

// @media (max-width: 576px) {
//   .container-fluid {
//     padding-left: 0.75rem;
//     padding-right: 0.75rem;
//   }
  
//   .card-body {
//     padding: 1rem;
//   }
  
//   .btn {
//     font-size: 0.875rem;
//   }
  
//   .btn-sm {
//     font-size: 0.75rem;
//   }
  
//   .form-control, .form-select {
//     font-size: 0.875rem;
//   }
  
//   .modal-dialog {
//     margin: 0.5rem;
//   }
  
//   .offcanvas-body {
//     padding: 1rem;
//   }
  
//   .dropdown-menu {
//     min-width: 160px;
//   }
  
//   .taxonomy-container {
//     max-height: 150px;
//   }
// }

// /* Small mobile devices */
// @media (max-width: 375px) {
//   .container-fluid {
//     padding-left: 0.5rem;
//     padding-right: 0.5rem;
//   }
  
//   .card-header {
//     padding: 0.75rem 1rem;
//   }
  
//   .btn-group .btn {
//     padding: 0.25rem 0.5rem;
//   }
  
//   .risk-item {
//     min-width: 100px;
//     padding: 8px 12px;
//   }
// }

// /* ========================= PRINT STYLES ========================= */
// @media print {
//   .btn,
//   .dropdown,
//   .offcanvas,
//   .alert,
//   .pagination,
//   .form-check,
//   .form-switch {
//     display: none !important;
//   }
  
//   .card {
//     border: 1px solid #000 !important;
//     box-shadow: none !important;
//     break-inside: avoid;
//   }
  
//   .table {
//     border: 1px solid #000;
//     break-inside: avoid;
//   }
  
//   .badge {
//     border: 1px solid #000;
//     background: white !important;
//     color: black !important;
//   }
  
//   a {
//     color: black !important;
//     text-decoration: underline !important;
//   }
  
//   .container-fluid {
//     max-width: 100%;
//     padding: 0;
//   }
// }

// /* ========================= DARK MODE SUPPORT ========================= */
// @media (prefers-color-scheme: dark) {
//   :root {
//     --light-color: #2d3748;
//     --lighter-color: #4a5568;
//     --dark-color: #f7fafc;
//     --darker-color: #e2e8f0;
//     --muted-color: #a0aec0;
//     --border-color: #4a5568;
//     --border-light: #718096;
//   }
  
//   .card {
//     background-color: var(--light-color);
//     border-color: var(--border-color);
//   }
  
//   .card-header {
//     background: linear-gradient(135deg, var(--light-color) 0%, #2d3748 100%);
//     border-bottom-color: var(--border-color);
//   }
  
//   .table {
//     --bs-table-bg: transparent;
//     --bs-table-color: var(--dark-color);
//     --bs-table-striped-bg: rgba(255, 255, 255, 0.05);
//     --bs-table-hover-bg: rgba(255, 255, 255, 0.08);
//   }
  
//   .table-light {
//     --bs-table-bg: var(--light-color);
//     --bs-table-striped-bg: rgba(255, 255, 255, 0.08);
//   }
  
//   .form-control,
//   .form-select {
//     background-color: var(--light-color);
//     border-color: var(--border-color);
//     color: var(--dark-color);
//   }
  
//   .form-control:focus,
//   .form-select:focus {
//     background-color: var(--light-color);
//     color: var(--dark-color);
//   }
  
//   .input-group-text {
//     background-color: var(--lighter-color);
//     border-color: var(--border-color);
//     color: var(--muted-color);
//   }
  
//   .dropdown-menu {
//     background-color: var(--light-color);
//     border-color: var(--border-color);
//   }
  
//   .dropdown-item {
//     color: var(--dark-color);
//   }
  
//   .dropdown-item:hover,
//   .dropdown-item:focus {
//     background-color: var(--lighter-color);
//     color: var(--dark-color);
//   }
  
//   .modal-content {
//     background-color: var(--light-color);
//     color: var(--dark-color);
//   }
  
//   .offcanvas {
//     background-color: var(--light-color);
//     color: var(--dark-color);
//   }
  
//   .alert {
//     background-color: var(--lighter-color);
//     border-color: var(--border-color);
//     color: var(--dark-color);
//   }
// }

// /* ========================= UTILITY CLASSES ========================= */
// .sticky-top {
//   position: sticky;
//   z-index: 10;
// }

// .cursor-pointer {
//   cursor: pointer;
// }

// .user-select-none {
//   user-select: none;
// }

// .opacity-75 {
//   opacity: 0.75;
// }

// .opacity-50 {
//   opacity: 0.5;
// }

// .z-index-100 {
//   z-index: 100;
// }

// .z-index-1000 {
//   z-index: 1000;
// }

// .min-h-100 {
//   min-height: 100%;
// }

// .flex-grow-1 {
//   flex-grow: 1;
// }

// .flex-shrink-0 {
//   flex-shrink: 0;
// }

// .text-decoration-none:hover {
//   text-decoration: none !important;
// }

// /* ========================= CUSTOM SCROLLBAR ========================= */
// .custom-scrollbar::-webkit-scrollbar {
//   width: 8px;
// }

// .custom-scrollbar::-webkit-scrollbar-track {
//   background: #f1f1f1;
//   border-radius: 4px;
// }

// .custom-scrollbar::-webkit-scrollbar-thumb {
//   background: #c1c1c1;
//   border-radius: 4px;
// }

// .custom-scrollbar::-webkit-scrollbar-thumb:hover {
//   background: #a8a8a8;
// }

// /* Firefox scrollbar */
// .custom-scrollbar {
//   scrollbar-width: thin;
//   scrollbar-color: #c1c1c1 #f1f1f1;
// }

// /* ========================= ACCESSIBILITY ENHANCEMENTS ========================= */
// .visually-hidden {
//   position: absolute !important;
//   width: 1px !important;
//   height: 1px !important;
//   padding: 0 !important;
//   margin: -1px !important;
//   overflow: hidden !important;
//   clip: rect(0, 0, 0, 0) !important;
//   white-space: nowrap !important;
//   border: 0 !important;
// }

// [aria-busy="true"] {
//   opacity: 0.7;
//   pointer-events: none;
// }

// [aria-disabled="true"] {
//   opacity: 0.5;
//   pointer-events: none;
// }

// [aria-hidden="true"] {
//   display: none !important;
// }

// /* Focus indicators for keyboard navigation */
// .keyboard-nav :focus {
//   outline: 2px solid var(--primary-color);
//   outline-offset: 2px;
// }

// /* High contrast mode improvements */
// @media (prefers-contrast: high) {
//   .btn {
//     border-width: 2px;
//   }
  
//   .card {
//     border-width: 2px;
//   }
  
//   .table th {
//     border-bottom-width: 3px;
//   }
  
//   .risk-item.selected {
//     border-width: 2px;
//   }
// }
// </style>

// <!-- ========================= SCRIPTS ========================= -->
// <script>
// // ========================= DASHBOARD APPLICATION =========================
// class DashboardApp {
//     constructor() {
//         this.currentThemeId = null;
//         this.currentEventId = null;
//         this.currentPage = 1;
//         this.showArchived = false;
//         this.isLoading = false;
//         this.currentAction = null;
//         this.searchTimeouts = {};
        
//         this.init();
//     }

//     // ========================= INITIALIZATION =========================
//     init() {
//         console.log('Initializing Dashboard Application...');
        
//         try {
//             this.initializeEventListeners();
//             this.initializeComponents();
//             this.applyInitialState();
//             this.setupErrorHandling();
            
//             console.log('Dashboard application initialized successfully');
//         } catch (error) {
//             console.error('Failed to initialize dashboard application:', error);
//             this.showNotification('Failed to initialize dashboard. Please refresh the page.', 'error');
//         }
//     }

//     // ========================= ERROR HANDLING =========================
//     setupErrorHandling() {
//         window.addEventListener('error', (event) => {
//             console.error('Global error caught:', event.error);
//             this.logError('GlobalError', event.error);
//         });

//         window.addEventListener('unhandledrejection', (event) => {
//             console.error('Unhandled promise rejection:', event.reason);
//             this.logError('UnhandledRejection', event.reason);
//             event.preventDefault();
//         });
//     }

//     logError(type, error) {
//         const errorInfo = {
//             type: type,
//             message: error?.message || 'Unknown error',
//             stack: error?.stack,
//             timestamp: new Date().toISOString(),
//             url: window.location.href,
//             userAgent: navigator.userAgent
//         };
        
//         console.error('Error logged:', errorInfo);
//     }

//     // ========================= EVENT LISTENERS =========================
//     initializeEventListeners() {
//         // Search functionality with debouncing
//         this.debouncedSearchThreats = this.debounce(this.performSearch.bind(this, 'theme'), 300);
//         this.debouncedSearchEvents = this.debounce(this.performSearch.bind(this, 'event'), 300);
        
//         $('#threatSearch').on('input', this.debouncedSearchThreats);
//         $('#eventSearch').on('input', this.debouncedSearchEvents);

//         // Archive filters
//         $('#showArchivedThreats').on('change', this.updateArchivedFilter.bind(this));
//         $('#showArchivedEvents').on('change', this.updateArchivedFilter.bind(this));

//         // Archive actions with event delegation
//         $(document).on('click', '.archive-theme-btn', this.handleArchiveTheme.bind(this));
//         $(document).on('click', '.archive-event-btn', this.handleArchiveEvent.bind(this));

//         // Edit actions
//         $(document).on('click', '.edit-theme-btn', this.handleEditTheme.bind(this));
//         $(document).on('click', '.edit-event-btn', this.handleEditEvent.bind(this));

//         // Add event from threat
//         $(document).on('click', '.add-event-from-threat', this.handleAddEventFromThreat.bind(this));

//         // Confirmation modal
//         $('#confirmActionBtn').on('click', this.handleConfirmAction.bind(this));

//         // View all modals
//         $(document).on('click', '[data-bs-target="#viewAllThreatsModal"]', this.handleViewAllThreats.bind(this));
//         $(document).on('click', '[data-bs-target="#viewAllEventsModal"]', this.handleViewAllEvents.bind(this));

//         // Offcanvas event handlers
//         this.initializeOffcanvasHandlers();

//         // Keyboard shortcuts
//         this.initializeKeyboardShortcuts();

//         // Form submissions
//         this.initializeFormHandlers();

//         // Window events
//         this.initializeWindowEvents();
//     }

//     initializeWindowEvents() {
//         // Handle page visibility changes
//         document.addEventListener('visibilitychange', () => {
//             if (document.visibilityState === 'visible') {
//                 this.handlePageVisible();
//             }
//         });

//         // Handle beforeunload for unsaved changes
//         window.addEventListener('beforeunload', (event) => {
//             if (this.hasUnsavedChanges()) {
//                 event.preventDefault();
//                 event.returnValue = '';
//                 return '';
//             }
//         });
//     }

//     hasUnsavedChanges() {
//         // Check if any form has unsaved changes
//         const forms = document.querySelectorAll('form');
//         return Array.from(forms).some(form => {
//             const formData = new FormData(form);
//             let hasChanges = false;
            
//             for (let [key, value] of formData.entries()) {
//                 if (value && value.toString().trim() !== '') {
//                     hasChanges = true;
//                     break;
//                 }
//             }
//             return hasChanges;
//         });
//     }

//     handlePageVisible() {
//         console.log('Dashboard page became visible');
//         // You could refresh data here if needed
//     }

//     // ========================= COMPONENT INITIALIZATION =========================
//     initializeComponents() {
//         this.initializeAddThreatModal();
//         this.initializeEditThreatModal();
//         this.initializeAddEventModal();
//         this.initializeEditEventModal();
//         this.initializeViewAllModals();
//         this.initializeThemeDetailOffcanvas();
//         this.initializeRiskCards();
//     }

//     initializeRiskCards() {
//         // Initialize risk cards for all modals
//         this.setupRiskCards('#addThreatModal');
//         this.setupRiskCards('#editThreatModal');
//         this.setupRiskCards('#addEventModal');
//         this.setupRiskCards('#editEventModal');
//     }

//     initializeOffcanvasHandlers() {
//         // Handle offcanvas show events
//         $('#viewAllThreatsModal').on('show.bs.offcanvas', () => {
//             this.currentPage = 1;
//             this.showArchived = $('#offcanvasToggleArchived').is(':checked');
//             this.loadOffcanvasThemes();
//         });

//         $('#viewAllEventsModal').on('show.bs.offcanvas', () => {
//             this.currentPage = 1;
//             this.showArchived = $('#offcanvasEventsToggleArchived').is(':checked');
//             this.loadOffcanvasEvents();
//         });

//         // Handle offcanvas hidden events
//         $('.offcanvas').on('hidden.bs.offcanvas', (event) => {
//             const offcanvasId = event.target.id;
//             this.handleOffcanvasClose(offcanvasId);
//         });
//     }

//     handleOffcanvasClose(offcanvasId) {
//         switch (offcanvasId) {
//             case 'addThreatModal':
//             case 'editThreatModal':
//             case 'addEventModal':
//             case 'editEventModal':
//                 this.resetForm(offcanvasId);
//                 break;
//         }
//     }

//     initializeFormHandlers() {
//         // Global form validation
//         $(document).on('submit', 'form', (event) => {
//             this.handleFormSubmit(event);
//         });

//         // Character counters
//         $(document).on('input', '[maxlength]', (event) => {
//             this.updateCharCounter(event.target);
//         });
//     }

//     // ========================= UTILITY FUNCTIONS =========================
//     debounce(func, wait, immediate = false) {
//         let timeout;
//         return function executedFunction(...args) {
//             const later = () => {
//                 clearTimeout(timeout);
//                 if (!immediate) func(...args);
//             };
//             const callNow = immediate && !timeout;
//             clearTimeout(timeout);
//             timeout = setTimeout(later, wait);
//             if (callNow) func(...args);
//         };
//     }

//     throttle(func, limit) {
//         let inThrottle;
//         return function(...args) {
//             if (!inThrottle) {
//                 func.apply(this, args);
//                 inThrottle = true;
//                 setTimeout(() => inThrottle = false, limit);
//             }
//         };
//     }

//     setLoadingState(element, isLoading, loadingText = 'Loading...') {
//         if (!element || !element.length) return;

//         if (isLoading) {
//             element.prop('disabled', true).addClass('btn-loading');
//             element.data('original-text', element.html());
//             element.html(`<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${loadingText}`);
//         } else {
//             element.prop('disabled', false).removeClass('btn-loading');
//             if (element.data('original-text')) {
//                 element.html(element.data('original-text'));
//             }
//         }
//     }

//     showNotification(message, type = 'info', duration = 5000) {
//         const types = {
//             success: { icon: 'check-circle', class: 'success' },
//             error: { icon: 'exclamation-triangle', class: 'danger' },
//             warning: { icon: 'exclamation-circle', class: 'warning' },
//             info: { icon: 'info-circle', class: 'info' }
//         };

//         const config = types[type] || types.info;
        
//         // Remove existing notifications of the same type
//         $(`.alert-${config.class}`).alert('close');
        
//         const toast = document.createElement('div');
//         toast.className = `alert alert-${config.class} alert-dismissible fade show position-fixed`;
//         toast.style.cssText = 'top: 20px; right: 20px; z-index: 1060; min-width: 300px; max-width: 500px;';
//         toast.setAttribute('role', 'alert');
//         toast.setAttribute('aria-live', 'polite');
//         toast.setAttribute('aria-atomic', 'true');
        
//         toast.innerHTML = `
//             <div class="d-flex align-items-center">
//                 <i class="fas fa-${config.icon} me-2" aria-hidden="true"></i>
//                 <span>${message}</span>
//                 <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close notification"></button>
//             </div>
//         `;
        
//         document.body.appendChild(toast);
        
//         // Auto-remove after duration
//         setTimeout(() => {
//             if (toast.parentNode) {
//                 $(toast).alert('close');
//             }
//         }, duration);

//         // Add event listener for close
//         $(toast).on('closed.bs.alert', () => {
//             if (toast.parentNode) {
//                 toast.parentNode.removeChild(toast);
//             }
//         });
//     }

//     // ========================= SEARCH & FILTER FUNCTIONALITY =========================
//     performSearch(tableType, event) {
//         const searchTerm = event.target.value.toLowerCase().trim();
//         const rows = $(`.${tableType}-row`);
//         const showArchived = tableType === 'theme' ? 
//             $('#showArchivedThreats').is(':checked') : 
//             $('#showArchivedEvents').is(':checked');
        
//         let visibleCount = 0;
        
//         rows.each((index, row) => {
//             const $row = $(row);
//             const rowText = $row.text().toLowerCase();
//             const isActive = $row.data('is-active') === true;
            
//             const matchesSearch = searchTerm === '' || rowText.includes(searchTerm);
//             const shouldShow = matchesSearch && (isActive || showArchived);
            
//             if (shouldShow) {
//                 $row.show();
//                 visibleCount++;
//             } else {
//                 $row.hide();
//             }
//         });
        
//         this.updateSearchResultsInfo(tableType, visibleCount, rows.length);
        
//         // Update URL without page reload (for sharing)
//         this.updateSearchURL(tableType, searchTerm);
//     }

//     updateSearchResultsInfo(tableType, visible, total) {
//         const message = `${visible} of ${total} ${tableType}s displayed`;
//         let infoElement = $(`#${tableType}-search-results`);
        
//         if (!infoElement.length) {
//             infoElement = $(`<div id="${tableType}-search-results" class="sr-only" aria-live="polite" aria-atomic="true"></div>`);
//             $('body').append(infoElement);
//         }
        
//         infoElement.text(message);
//     }

//     updateSearchURL(tableType, searchTerm) {
//         const url = new URL(window.location);
        
//         if (searchTerm) {
//             url.searchParams.set(`${tableType}Search`, searchTerm);
//         } else {
//             url.searchParams.delete(`${tableType}Search`);
//         }
        
//         // Update URL without reloading page
//         window.history.replaceState({}, '', url);
//     }

//     updateArchivedFilter() {
//         const showArchivedThreats = $('#showArchivedThreats').is(':checked');
//         const showArchivedEvents = $('#showArchivedEvents').is(':checked');
        
//         this.filterTableRows('.theme-row', showArchivedThreats, $('#threatSearch').val());
//         this.filterTableRows('.event-row', showArchivedEvents, $('#eventSearch').val());
//     }

//     filterTableRows(selector, showArchived, searchTerm) {
//         const rows = $(selector);
//         const searchLower = (searchTerm || '').toLowerCase();
        
//         rows.each((index, row) => {
//             const $row = $(row);
//             const isActive = $row.data('is-active') === true;
//             const rowText = $row.text().toLowerCase();
            
//             const matchesSearch = searchLower === '' || rowText.includes(searchLower);
//             const shouldShow = matchesSearch && (isActive || showArchived);
            
//             $row.toggle(shouldShow);
//         });
//     }

//     // ========================= ARCHIVE FUNCTIONALITY =========================
//     handleArchiveTheme(event) {
//         event.preventDefault();
//         const button = $(event.currentTarget);
//         this.currentAction = {
//             type: 'theme',
//             id: button.data('theme-id'),
//             name: button.data('theme-name'),
//             isActive: button.data('is-active'),
//             url: `/themes/${button.data('theme-id')}/toggle-active/`,
//             element: button
//         };
//         this.showConfirmationModal();
//     }

//     handleArchiveEvent(event) {
//         event.preventDefault();
//         const button = $(event.currentTarget);
//         this.currentAction = {
//             type: 'event',
//             id: button.data('event-id'),
//             name: button.data('event-name'),
//             isActive: button.data('is-active'),
//             url: `/events/${button.data('event-id')}/toggle-active/`,
//             element: button
//         };
//         this.showConfirmationModal();
//     }

//     showConfirmationModal() {
//         if (!this.currentAction) return;
        
//         const actionType = this.currentAction.isActive ? 'archive' : 'restore';
//         const actionText = this.currentAction.isActive ? 'Archive' : 'Restore';
//         const itemType = this.currentAction.type === 'theme' ? 'Threat' : 'Event';
        
//         let message = '';
//         if (this.currentAction.isActive) {
//             message = `Are you sure you want to archive the ${itemType.toLowerCase()} "<strong>${this.currentAction.name}</strong>"?<br><br>
//                       <small class="text-muted">Archived items will be hidden from the main lists but can be restored later.</small>`;
//         } else {
//             message = `Are you sure you want to restore the ${itemType.toLowerCase()} "<strong>${this.currentAction.name}</strong>"?<br><br>
//                       <small class="text-muted">Restored items will be visible in the main lists again.</small>`;
//         }
        
//         $('#confirmationModalBody').html(message);
//         $('#confirmActionBtn')
//             .text(`Yes, ${actionText}`)
//             .toggleClass('btn-danger', this.currentAction.isActive)
//             .toggleClass('btn-success', !this.currentAction.isActive);
        
//         const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
//         modal.show();
//     }

//     async handleConfirmAction() {
//         if (!this.currentAction) return;
        
//         const submitBtn = $('#confirmActionBtn');
//         this.setLoadingState(submitBtn, true);
        
//         try {
//             const response = await $.ajax({
//                 url: this.currentAction.url,
//                 type: 'POST',
//                 data: {
//                     csrfmiddlewaretoken: this.getCSRFToken(),
//                     next: window.location.href
//                 },
//                 timeout: 10000 // 10 second timeout
//             });
            
//             if (response.success) {
//                 const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
//                 modal.hide();
                
//                 const actionType = this.currentAction.isActive ? 'archived' : 'restored';
//                 const itemType = this.currentAction.type === 'theme' ? 'Threat' : 'Event';
//                 this.showNotification(`${itemType} "${this.currentAction.name}" has been ${actionType} successfully!`, 'success');
                
//                 // Reload the page to reflect changes
//                 setTimeout(() => {
//                     window.location.reload();
//                 }, 1000);
//             } else {
//                 this.showNotification(`Error: ${response.message || 'Unable to complete the action'}`, 'error');
//             }
//         } catch (error) {
//             console.error('Archive action failed:', error);
//             let errorMessage = 'Error completing the action. ';
            
//             if (error.status === 403) {
//                 errorMessage += 'Permission denied.';
//             } else if (error.status === 404) {
//                 errorMessage += 'Item not found.';
//             } else if (error.status === 500) {
//                 errorMessage += 'Server error. Please try again later.';
//             } else if (error.statusText === 'timeout') {
//                 errorMessage += 'Request timeout. Please try again.';
//             } else {
//                 errorMessage += 'Please try again.';
//             }
            
//             this.showNotification(errorMessage, 'error');
//         } finally {
//             this.setLoadingState(submitBtn, false);
//             this.currentAction = null;
//         }
//     }

//     // ========================= MODAL FUNCTIONALITY =========================
//     initializeAddThreatModal() {
//         const modal = document.getElementById('addThreatModal');
//         if (!modal) return;

//         // Character counter
//         $('#name').on('input', () => {
//             this.updateCharCounter(document.getElementById('name'), 'nameCounter', 30);
//         });
        
//         // Risk cards functionality
//         this.setupRiskCards('#addThreatModal');
        
//         // Form submission
//         $('#addThreatForm').on('submit', this.handleAddThreatSubmit.bind(this));
        
//         // Reset form on hide
//         $(modal).on('hidden.bs.offcanvas', () => {
//             this.resetForm('addThreatForm');
//             $('#nameCounter').text('0/30').removeClass('text-warning text-danger').addClass('text-muted');
//         });
//     }

//     initializeEditThreatModal() {
//         $(document).on('click', '.edit-theme-btn', (event) => {
//             event.preventDefault();
//             const themeId = $(event.currentTarget).data('theme-id');
//             this.loadThemeForEdit(themeId);
//         });

//         $('#editThreatForm').on('submit', this.handleEditThreatSubmit.bind(this));
        
//         $('#editThreatModal').on('hidden.bs.offcanvas', () => {
//             this.currentThemeId = null;
//             this.resetForm('editThreatForm');
//         });
//     }

//     initializeAddEventModal() {
//         $('#addEventModal').on('show.bs.offcanvas', () => {
//             this.initializeEventForm('addEventForm');
//         });

//         $('#addEventForm').on('submit', this.handleAddEventSubmit.bind(this));
//     }

//     initializeEditEventModal() {
//         $(document).on('click', '.edit-event-btn', (event) => {
//             event.preventDefault();
//             const eventId = $(event.currentTarget).data('event-id');
//             this.loadEventForEdit(eventId);
//         });

//         $('#editEventForm').on('submit', this.handleEditEventSubmit.bind(this));
//     }

//     // ========================= FORM HANDLERS =========================
//     async handleAddThreatSubmit(event) {
//         event.preventDefault();
        
//         const form = event.target;
//         const formData = new FormData(form);
//         const submitBtn = $(form).find('button[type="submit"]');
        
//         if (!this.validateForm(form)) {
//             return;
//         }
        
//         this.setLoadingState(submitBtn, true);
        
//         try {
//             const response = await $.ajax({
//                 url: form.action,
//                 type: 'POST',
//                 data: formData,
//                 headers: {
//                     'X-Requested-With': 'XMLHttpRequest',
//                     'X-CSRFToken': this.getCSRFToken()
//                 },
//                 timeout: 15000
//             });
            
//             if (response.success) {
//                 this.showNotification('Threat created successfully!', 'success');
//                 this.closeOffcanvas('addThreatModal');
                
//                 if (response.theme_id) {
//                     setTimeout(() => {
//                         window.location.href = `?theme_id=${response.theme_id}`;
//                     }, 1000);
//                 } else if (response.redirect_url) {
//                     window.location.href = response.redirect_url;
//                 } else {
//                     window.location.reload();
//                 }
//             } else {
//                 this.showNotification(response.message || 'Error creating threat', 'error');
//                 this.displayFormErrors(form, response.errors);
//             }
//         } catch (error) {
//             console.error('Add threat failed:', error);
//             this.handleAjaxError(error, 'creating threat');
//         } finally {
//             this.setLoadingState(submitBtn, false);
//         }
//     }

//     async handleEditThreatSubmit(event) {
//         event.preventDefault();
        
//         if (!this.currentThemeId) return;
        
//         const form = event.target;
//         const formData = new FormData(form);
//         const submitBtn = $(form).find('button[type="submit"]');
        
//         if (!this.validateForm(form)) {
//             return;
//         }
        
//         this.setLoadingState(submitBtn, true);
        
//         try {
//             const response = await $.ajax({
//                 url: `/themes/${this.currentThemeId}/edit/`,
//                 type: 'POST',
//                 data: formData,
//                 headers: {
//                     'X-Requested-With': 'XMLHttpRequest',
//                     'X-CSRFToken': this.getCSRFToken()
//                 },
//                 timeout: 15000
//             });
            
//             if (response.success) {
//                 this.showNotification('Threat updated successfully!', 'success');
//                 this.closeOffcanvas('editThreatModal');
//                 setTimeout(() => window.location.reload(), 1000);
//             } else {
//                 this.showNotification(response.message || 'Error updating threat', 'error');
//                 this.displayFormErrors(form, response.errors);
//             }
//         } catch (error) {
//             console.error('Edit threat failed:', error);
//             this.handleAjaxError(error, 'updating threat');
//         } finally {
//             this.setLoadingState(submitBtn, false);
//         }
//     }

//     async handleAddEventSubmit(event) {
//         event.preventDefault();
        
//         const form = event.target;
//         const submitBtn = $(form).find('button[type="submit"]');
        
//         if (!this.validateEventForm(form)) {
//             return;
//         }
        
//         this.setLoadingState(submitBtn, true);
        
//         try {
//             const response = await $.ajax({
//                 url: form.action,
//                 type: 'POST',
//                 data: $(form).serialize(),
//                 headers: {
//                     'X-Requested-With': 'XMLHttpRequest',
//                     'X-CSRFToken': this.getCSRFToken()
//                 },
//                 timeout: 15000
//             });
            
//             if (response.success) {
//                 this.showNotification('Event created successfully!', 'success');
//                 this.closeOffcanvas('addEventModal');
                
//                 if (response.redirect_url) {
//                     window.location.href = response.redirect_url;
//                 } else {
//                     window.location.reload();
//                 }
//             } else {
//                 this.showNotification(response.message || 'Error creating event', 'error');
//                 this.displayFormErrors(form, response.errors);
//             }
//         } catch (error) {
//             console.error('Add event failed:', error);
//             this.handleAjaxError(error, 'creating event');
//         } finally {
//             this.setLoadingState(submitBtn, false);
//         }
//     }

//     async handleEditEventSubmit(event) {
//         event.preventDefault();
        
//         if (!this.currentEventId) return;
        
//         const form = event.target;
//         const submitBtn = $(form).find('button[type="submit"]');
        
//         if (!this.validateEventForm(form)) {
//             return;
//         }
        
//         this.setLoadingState(submitBtn, true);
        
//         try {
//             const response = await $.ajax({
//                 url: `/events/${this.currentEventId}/edit/`,
//                 type: 'POST',
//                 data: $(form).serialize(),
//                 headers: {
//                     'X-Requested-With': 'XMLHttpRequest',
//                     'X-CSRFToken': this.getCSRFToken()
//                 },
//                 timeout: 15000
//             });
            
//             if (response.success) {
//                 this.showNotification('Event updated successfully!', 'success');
//                 this.closeOffcanvas('editEventModal');
//                 setTimeout(() => window.location.reload(), 1000);
//             } else {
//                 this.showNotification(response.message || 'Error updating event', 'error');
//                 this.displayFormErrors(form, response.errors);
//             }
//         } catch (error) {
//             console.error('Edit event failed:', error);
//             this.handleAjaxError(error, 'updating event');
//         } finally {
//             this.setLoadingState(submitBtn, false);
//         }
//     }

//     handleFormSubmit(event) {
//         const form = event.target;
        
//         if (!form.checkValidity()) {
//             event.preventDefault();
//             event.stopPropagation();
//             form.classList.add('was-validated');
//             this.scrollToFirstInvalid(form);
//         }
//     }

//     // ========================= VALIDATION =========================
//     validateForm(form) {
//         let isValid = true;
//         const elements = form.elements;
        
//         // Reset previous errors
//         $(form).find('.is-invalid').removeClass('is-invalid');
//         $(form).find('.invalid-feedback').hide();
        
//         for (let element of elements) {
//             if (element.required && !element.value.trim()) {
//                 this.markFieldInvalid(element, 'This field is required');
//                 isValid = false;
//             }
            
//             if (element.type === 'email' && element.value) {
//                 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//                 if (!emailRegex.test(element.value)) {
//                     this.markFieldInvalid(element, 'Please enter a valid email address');
//                     isValid = false;
//                 }
//             }
            
//             if (element.hasAttribute('maxlength')) {
//                 const maxLength = parseInt(element.getAttribute('maxlength'));
//                 if (element.value.length > maxLength) {
//                     this.markFieldInvalid(element, `Maximum ${maxLength} characters allowed`);
//                     isValid = false;
//                 }
//             }
            
//             if (element.type === 'date' && element.value) {
//                 const selectedDate = new Date(element.value);
//                 const today = new Date();
//                 today.setHours(0, 0, 0, 0);
                
//                 if (selectedDate > today) {
//                     this.markFieldInvalid(element, 'Date cannot be in the future');
//                     isValid = false;
//                 }
//             }
//         }
        
//         if (!isValid) {
//             form.classList.add('was-validated');
//             this.scrollToFirstInvalid(form);
//         }
        
//         return isValid;
//     }

//     validateEventForm(form) {
//         // Basic form validation
//         if (!this.validateForm(form)) {
//             return false;
//         }
        
//         // Additional event-specific validation
//         let isValid = true;
        
//         // Risk rating validation
//         const riskRating = form.querySelector('#event_risk_rating, #edit_event_risk_rating');
//         if (riskRating && !riskRating.value) {
//             this.markFieldInvalid(riskRating, 'Please select a risk rating');
//             isValid = false;
//         }
        
//         return isValid;
//     }

//     markFieldInvalid(element, message) {
//         $(element).addClass('is-invalid');
//         let feedback = $(element).next('.invalid-feedback');
        
//         if (!feedback.length) {
//             feedback = $(`<div class="invalid-feedback d-block">${message}</div>`);
//             $(element).after(feedback);
//         } else {
//             feedback.text(message).show();
//         }
        
//         // Add shake animation for attention
//         element.classList.add('shake');
//         setTimeout(() => {
//             element.classList.remove('shake');
//         }, 500);
//     }

//     scrollToFirstInvalid(form) {
//         const firstInvalid = form.querySelector('.is-invalid');
//         if (firstInvalid) {
//             firstInvalid.scrollIntoView({ 
//                 behavior: 'smooth', 
//                 block: 'center' 
//             });
//             firstInvalid.focus({ preventScroll: true });
//         }
//     }

//     displayFormErrors(form, errors) {
//         if (!errors) return;
        
//         for (const [field, fieldErrors] of Object.entries(errors)) {
//             const element = form.querySelector(`[name="${field}"]`);
//             if (element) {
//                 this.markFieldInvalid(element, fieldErrors.join(', '));
//             }
//         }
//     }

//     // ========================= RISK CARDS FUNCTIONALITY =========================
//     setupRiskCards(modalSelector) {
//         const riskSelect = $(`${modalSelector} select.risk-rating, ${modalSelector} select.edit-risk-rating`);
//         const riskCards = $(`${modalSelector} .risk-card, ${modalSelector} .edit-risk-card`);
//         const riskError = $(`${modalSelector} #risk-error, ${modalSelector} #edit-risk-error`);
//         const cardsBox = $(`${modalSelector} #risk-cards, ${modalSelector} #edit-risk-cards`);
        
//         if (!riskSelect.length || !riskCards.length) return;
        
//         const syncCardsFromSelect = () => {
//             const val = riskSelect.val();
//             if (val) {
//                 riskCards.each(function() {
//                     const card = $(this);
//                     const isSelected = card.data('value') === val;
//                     card.find('.risk-card-inner, .edit-risk-card-inner').toggleClass('selected', isSelected);
//                     card.attr('aria-checked', isSelected);
//                 });
//             } else {
//                 riskCards.each(function() {
//                     $(this).find('.risk-card-inner, .edit-risk-card-inner').removeClass('selected');
//                 });
//             }
//         };
        
//         const setRiskFromCard = (cardValue) => {
//             riskSelect.val(cardValue);
//             syncCardsFromSelect();
//             riskError.hide();
//             cardsBox.removeClass('is-invalid');
//         };
        
//         riskCards.on('click', function() {
//             setRiskFromCard($(this).data('value'));
//         });
        
//         // Keyboard navigation
//         riskCards.on('keydown', function(event) {
//             if (event.key === 'Enter' || event.key === ' ') {
//                 event.preventDefault();
//                 setRiskFromCard($(this).data('value'));
//             }
//         });
        
//         // Initialize
//         syncCardsFromSelect();
//     }

//     // ========================= HELPER METHODS =========================
//     updateCharCounter(input, counterId = null, maxLength = null) {
//         if (!input) return;
        
//         const currentLength = input.value.length;
//         const actualMaxLength = maxLength || input.getAttribute('maxlength') || 30;
//         const counter = counterId ? document.getElementById(counterId) : input.nextElementSibling;
        
//         if (!counter) return;
        
//         counter.textContent = `${currentLength}/${actualMaxLength}`;
        
//         counter.className = 'text-muted small float-end';
//         if (currentLength > actualMaxLength * 0.8) {
//             counter.classList.add('text-warning');
//         }
//         if (currentLength >= actualMaxLength) {
//             counter.classList.add('text-danger');
//         }
//     }

//     getCSRFToken() {
//         return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
//     }

//     closeOffcanvas(offcanvasId) {
//         const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById(offcanvasId));
//         if (offcanvas) {
//             offcanvas.hide();
//         }
//     }

//     resetForm(formId) {
//         const form = typeof formId === 'string' ? document.getElementById(formId) : formId;
//         if (form) {
//             form.reset();
//             form.classList.remove('was-validated');
//             $(form).find('.is-invalid').removeClass('is-invalid');
//             $(form).find('.invalid-feedback').hide();
//         }
//     }

//     handleAjaxError(error, action) {
//         let errorMessage = `Error ${action}. `;
        
//         if (error.status === 0) {
//             errorMessage += 'Network error. Please check your connection.';
//         } else if (error.status === 403) {
//             errorMessage += 'Permission denied.';
//         } else if (error.status === 404) {
//             errorMessage += 'Resource not found.';
//         } else if (error.status === 500) {
//             errorMessage += 'Server error. Please try again later.';
//         } else if (error.statusText === 'timeout') {
//             errorMessage += 'Request timeout. Please try again.';
//         } else {
//             errorMessage += 'Please try again.';
//         }
        
//         this.showNotification(errorMessage, 'error');
//     }

//     // ========================= INITIAL STATE =========================
//     applyInitialState() {
//         this.updateArchivedFilter();
        
//         // Add skip link for accessibility
//         if (!$('#skip-link').length) {
//             $('body').prepend(
//                 '<a id="skip-link" class="skip-link" href="#main-content">Skip to main content</a>'
//             );
//         }

//         // Initialize tooltips
//         this.initializeTooltips();

//         // Restore search state from URL
//         this.restoreSearchState();
//     }

//     restoreSearchState() {
//         const urlParams = new URLSearchParams(window.location.search);
        
//         const threatSearch = urlParams.get('threatSearch');
//         if (threatSearch) {
//             $('#threatSearch').val(threatSearch);
//             this.performSearch('theme', { target: $('#threatSearch')[0] });
//         }
        
//         const eventSearch = urlParams.get('eventSearch');
//         if (eventSearch) {
//             $('#eventSearch').val(eventSearch);
//             this.performSearch('event', { target: $('#eventSearch')[0] });
//         }
//     }

//     // ========================= TOOLTIPS =========================
//     initializeTooltips() {
//         const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
//         tooltipTriggerList.map(function (tooltipTriggerEl) {
//             return new bootstrap.Tooltip(tooltipTriggerEl, {
//                 trigger: 'hover focus'
//             });
//         });
//     }

//     // ========================= KEYBOARD SHORTCUTS =========================
//     initializeKeyboardShortcuts() {
//         $(document).on('keydown', this.handleKeyboardShortcuts.bind(this));
//     }

//     handleKeyboardShortcuts(event) {
//         // Ctrl/Cmd + K for search
//         if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
//             event.preventDefault();
//             $('#threatSearch').focus();
//         }
        
//         // Escape key to close modals
//         if (event.key === 'Escape') {
//             this.closeAllModals();
//         }
        
//         // Tab key trapping in modals
//         if (event.key === 'Tab' && $('.modal.show').length) {
//             this.handleModalTab(event);
//         }
//     }

//     handleModalTab(event) {
//         const modal = $('.modal.show').first()[0];
//         if (!modal) return;
        
//         const focusableElements = modal.querySelectorAll(
//             'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
//         );
//         const firstElement = focusableElements[0];
//         const lastElement = focusableElements[focusableElements.length - 1];
        
//         if (event.shiftKey && document.activeElement === firstElement) {
//             event.preventDefault();
//             lastElement.focus();
//         } else if (!event.shiftKey && document.activeElement === lastElement) {
//             event.preventDefault();
//             firstElement.focus();
//         }
//     }

//     closeAllModals() {
//         $('.offcanvas.show').each((index, element) => {
//             const offcanvas = bootstrap.Offcanvas.getInstance(element);
//             if (offcanvas) offcanvas.hide();
//         });
        
//         $('.modal.show').each((index, element) => {
//             const modal = bootstrap.Modal.getInstance(element);
//             if (modal) modal.hide();
//         });
//     }

//     // ========================= LIFECYCLE =========================
//     destroy() {
//         // Cleanup event listeners
//         $('#threatSearch').off('input', this.debouncedSearchThreats);
//         $('#eventSearch').off('input', this.debouncedSearchEvents);
//         $('#showArchivedThreats').off('change');
//         $('#showArchivedEvents').off('change');
//         $(document).off('click', '.archive-theme-btn');
//         $(document).off('click', '.archive-event-btn');
//         $(document).off('click', '.edit-theme-btn');
//         $(document).off('click', '.edit-event-btn');
//         $(document).off('click', '.add-event-from-threat');
//         $('#confirmActionBtn').off('click');
//         $(document).off('keydown');
//         $(document).off('submit', 'form');
//         $(document).off('input', '[maxlength]');
        
//         // Remove all tooltips
//         const tooltipList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
//         tooltipList.forEach(tooltip => {
//             const instance = bootstrap.Tooltip.getInstance(tooltip);
//             if (instance) instance.dispose();
//         });
        
//         console.log('Dashboard application destroyed');
//     }
// }

// // ========================= INITIALIZATION =========================
// document.addEventListener('DOMContentLoaded', function() {
//     // Initialize the dashboard application
//     window.dashboardApp = new DashboardApp();
    
//     // Make app globally available for debugging
//     window.DashboardApp = DashboardApp;
// });

// // ========================= EXPORTS FOR MODULAR USE =========================
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = DashboardApp;
// }
// </script>

// ////////////////////////////////////////////////////////////////////////////////
// //               CATEGORY DROPDOWN FUNCTIONALITY
// ////////////////////////////////////////////////////////////////////////////////
// document.addEventListener('DOMContentLoaded', function() {
//     // Cerrar dropdown después de seleccionar una categoría
//     const categoryLinks = document.querySelectorAll('.dropdown-menu a[href*="category_id"]');
//     categoryLinks.forEach(link => {
//         link.addEventListener('click', function() {
//             const dropdown = this.closest('.dropdown');
//             if (dropdown) {
//                 const bsDropdown = bootstrap.Dropdown.getInstance(dropdown.querySelector('.dropdown-toggle'));
//                 if (bsDropdown) {
//                     bsDropdown.hide();
//                 }
//             }
//         });
//     });
    
//     // Mostrar badge con conteo de threats en la categoría seleccionada
//     const selectedCategory = document.querySelector('.dropdown-toggle');
//     if (selectedCategory && selectedCategory.textContent.includes('Categories')) {
//         // Actualizar el badge si hay una categoría seleccionada
//         const urlParams = new URLSearchParams(window.location.search);
//         const categoryId = urlParams.get('category_id');
        
//         if (categoryId) {
//             // Podrías hacer un fetch para obtener el conteo
//             // Por ahora, solo actualizamos el texto
//             fetch(`/api/category/${categoryId}/count/`)
//                 .then(response => response.json())
//                 .then(data => {
//                     // Aquí podrías actualizar algo si lo necesitas
//                 })
//                 .catch(error => console.error('Error:', error));
//         }
//     }
// });

// {% endblock %} */