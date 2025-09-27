from tethys_sdk.base import TethysAppBase
from tethys_sdk.app_settings import (
    PersistentStoreDatabaseSetting,
)

class App(TethysAppBase):
    """
    Tethys app class for FlowForge.
    """
    name = 'FlowForge'
    description = 'Visual Pipeline Studio for NextGen in a Box'
    package = 'flowforge'  # WARNING: Do not change this value
    index = 'home'
    icon = f'{package}/images/icon.png'
    catch_all = 'home'  # Catch all url mapped to home controller, required for react browser routing
    root_url = 'flowforge'
    color = ''  # Don't set color here, set it in reactapp/custom-bootstrap.scss
    tags = 'CIROH, NGIAB'
    enable_feedback = False
    feedback_emails = []

    def persistent_store_settings(self):
        return (
            # A concrete database this app will create/use
            PersistentStoreDatabaseSetting(
                name="workflows",
                description="Stores workflow and node state",
                initializer="ngiab.model.init_db.create_tables",
                spatial=False,   # set True if you need PostGIS
                required=True,
            ),
        )