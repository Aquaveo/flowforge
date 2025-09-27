import React, { Fragment, useEffect, useContext } from 'react';
import NgenMenuWrapper from 'features/ngen/components/ngenMenus';
import ModelRunsSelect from '../components/modelRunsSelect';
import { AppContext } from "context/context";
import { useModelRunsContext } from 'features/ModelRuns/hooks/useModelRunsContext';
import { useHydroFabricContext } from 'features/hydroFabric/hooks/useHydroFabricContext';

import { toast } from 'react-toastify';

const ModelRunMenuView = ({
  toggleSingleRow,
  setIsLoading,
  setIsMenuOpen,
  singleRowOn,
}) => {
  const { backend } = useContext(AppContext);
  const { actions: modelRunActions } = useModelRunsContext();
  const {actions: hydroFabricActions} = useHydroFabricContext();

  useEffect(() => {
    if (!backend) return;

    backend.on('MESSAGE_ACKNOWLEDGE', ({ message }) => {
      toast.info(message ?? 'Acknowledged.', { position: 'top-right', autoClose: 2000 });
    });
    
    backend.on('WORKFLOWS_VISUALIZATION_LIST', (payload) => {
      console.log('[ModelRunMenuView] received workflows visualization payload', payload);
      const { model_runs: modelRuns = [], items: workflows = [] } = payload || {};
      try {
        modelRunActions.set_model_run_list(modelRuns);
      } catch (err) {
        console.error('[ModelRunMenuView] error updating model run list', err);
        hydroFabricActions.reset();
      }
      // Optional: expose workflows if needed later
      if (!Array.isArray(workflows)) {
        console.warn('[ModelRunMenuView] workflows payload was not an array', workflows);
      }
    });

    backend.on('IMPORT_PROGRESS', ({ stage, s3_uri }) => {
      setIsLoading?.(true);
      toast.dismiss('import-progress');
      toast.loading(
        `Importing from S3 (${stage || 'working'})…${s3_uri ? `\n${s3_uri}` : ''}`,
        { toastId: 'import-progress', position: 'top-right' }
      );
    });

    backend.on('IMPORT_DONE', async ({ id, mode_run_select }) => {
      try {
        modelRunActions.set_model_run_list(mode_run_select);
        modelRunActions.set_base_model_id(id);
        toast.dismiss('import-progress');
        toast.success('S3 data imported and map data loaded.', { position: 'top-right' });
      } catch (err) {
        toast.dismiss('import-progress');
        toast.error(`Finished import but failed to load map data: ${String(err.message || err)}`);
      } finally {
        setIsLoading?.(false);
      }
    });

    return () => {
      backend.off('MESSAGE_ACKNOWLEDGE');
      backend.off('WORKFLOWS_VISUALIZATION_LIST');
      backend.off('IMPORT_PROGRESS');
      backend.off('IMPORT_DONE');
      toast.dismiss('import-progress');
      modelRunActions.reset();
      hydroFabricActions.reset();
    };
  }, [backend, setIsLoading, hydroFabricActions, modelRunActions]);
  
  return (
    <Fragment>
      <NgenMenuWrapper 
          toggleSingleRow={toggleSingleRow}
          setIsLoading={setIsLoading}
          setIsNgenMenuOpen={setIsMenuOpen}
          singleRowOn={singleRowOn}
          MenuComponent={ModelRunsSelect}
      />
    </Fragment>

  );
};

export default ModelRunMenuView;
