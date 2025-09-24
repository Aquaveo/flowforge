import { Route } from 'react-router-dom';

import ErrorBoundary from 'components/error/ErrorBoundary';
import Layout from 'components/layout/Layout';
import Loader from 'components/loader/Loader';
import 'App.scss';

import WorkflowsView from 'features/workflows/views/workflowsView';

function App() {
  const PATH_HOME = '/';
  const PATH_VISUALIZATION_DOCUMENTATION = 'https://docs.ciroh.org/training-NGIAB-101/visualization.html';
  const PATH_NGIAB_SITE = 'https://ngiab.ciroh.org';
  return (
    <>
      <ErrorBoundary>
          <Loader>
            <Layout 
              navLinks={[
                {title: '🦙 Workflows', to: PATH_HOME, eventKey: 'link-home'},
                {title: 'ℹ️ About NextGen In A Box', to: PATH_NGIAB_SITE,  external: true},
                {title: '📖 Visualizer Documentation', to: PATH_VISUALIZATION_DOCUMENTATION,  external: true},
              ]}
              routes={[
                <Route path={PATH_HOME} element={<WorkflowsView />} key='route-home' />
              ]}
            />
          </Loader>
      </ErrorBoundary>
    </>
  );
}

export default App;