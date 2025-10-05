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

    const dismissImportToast = () => {
      if (toast.isActive('import-progress')) {
        toast.dismiss('import-progress');
      }
    };

    backend.on('MESSAGE_ACKNOWLEDGE', ({ message }) => {
      toast.info(message ?? 'Acknowledged.', { position: 'top-center', autoClose: 2000 });
    });
    
    backend.on('WORKFLOWS_VISUALIZATION_LIST', (payload) => {
      console.log('[ModelRunMenuView] received workflows visualization payload', payload);
      const workflows = payload.items;
      try {
        modelRunActions.set_model_run_list(workflows);
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
      dismissImportToast();
      toast.loading(
        `Importing from S3 (${stage || 'working'})…${s3_uri ? `\n${s3_uri}` : ''}`,
        { toastId: 'import-progress', position: 'top-center' }
      );
    });

    backend.on('IMPORT_DONE', async ({ id, mode_run_select }) => {
      try {
        const fallbackId = () => {
          if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
          }
          return `temp-${Math.random().toString(36).slice(2, 10)}`;
        };

        const normalized = Array.isArray(mode_run_select)
          ? mode_run_select.map((item) => ({
              id: item?.value ?? item?.id ?? item?.name ?? fallbackId(),
              name: item?.label ?? item?.name ?? item?.value ?? 'Imported run',
              label: item?.label ?? item?.name ?? item?.value ?? 'Imported run',
              status: 'pending',
              created_at: null,
              updated_at: null,
              last_run_at: null,
              nodes: [],
            }))
          : [];

        modelRunActions.set_model_run_list(normalized);
        if (normalized.length > 0) {
          const selected = normalized.filter((run) => run.id === id);
          if (selected.length > 0) {
            modelRunActions.set_current_model_runs(selected);
          }
        }
        modelRunActions.set_base_model_id(id);
        // Request a fresh list with full metadata so the cards stay descriptive.
        try {
          backend.do(backend.actions.LIST_WORKFLOWS_VISUALIZATIONS, {});
        } catch (refreshErr) {
          console.warn('[ModelRunMenuView] failed to refresh workflows after import', refreshErr);
        }
        dismissImportToast();
        toast.success('S3 data imported and map data loaded.', { position: 'top-center' });
      } catch (err) {
        dismissImportToast();
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
      dismissImportToast();
      modelRunActions.reset();
      hydroFabricActions.reset();
    };
  }, [backend]);
  
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
