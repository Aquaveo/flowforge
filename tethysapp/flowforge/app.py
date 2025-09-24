from tethys_sdk.base import TethysAppBase


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