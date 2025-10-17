# tracker/db_routers.py
class RiskTaxonomyRouter:
    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'tracker' and model.__name__ == 'RiskTaxonomy':
            return 'risk_taxonomy'
        return None

    def db_for_write(self, model, **hints):
        return None

    def allow_relation(self, obj1, obj2, **hints):
        if (obj1._meta.app_label == 'tracker' and obj1.__class__.__name__ == 'RiskTaxonomy') or \
           (obj2._meta.app_label == 'tracker' and obj2.__class__.__name__ == 'RiskTaxonomy'):
            return False
        return None

    def allow_migrate(self, db, app_label=None, model_name=None, **hints):
        if app_label == 'tracker' and model_name == 'risktaxonomy':
            return False
        return None
