import React, { useEffect, Fragment, useContext, useRef, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import Button from 'react-bootstrap/Button';
import { FaList } from "react-icons/fa";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { VariableSizeList as List } from 'react-window';

import { useModelRunsContext } from 'features/ModelRuns/hooks/useModelRunsContext';
import { useHydroFabricContext } from 'features/hydroFabric/hooks/useHydroFabricContext';
// import appAPI from 'services/api/app';
import { AppContext } from 'context/context';
import ImportModel from 'features/ModelRuns/components/importModel';


const PANEL_WIDTH = 340;

const Container = styled.div`
  position: absolute;
  top: 24px;
  left: 24px;
  width: min(${PANEL_WIDTH}px, calc(100% - 48px));
  height: calc(100% - 48px);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-radius: 20px;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.82), rgba(12, 20, 33, 0.68));
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 24px 48px rgba(8, 47, 73, 0.32);
  backdrop-filter: blur(18px);
  color: #f8fafc;
  z-index: 1000;
  pointer-events: ${({ isOpen }) => (isOpen ? 'auto' : 'none')};
  transform: ${({ isOpen }) =>
    isOpen ? 'translateX(0)' : 'translateX(calc(-120%))'};
  transition: transform 260ms ease, box-shadow 260ms ease, border-color 260ms ease;
  will-change: transform;
`;

const TogggledButton = styled(Button)`
  position: absolute;
  top: 32px;
  left: ${({ $shifted }) =>
    $shifted
      ? `calc(24px + min(${PANEL_WIDTH}px, calc(100% - 48px)) + 16px)`
      : '24px'};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: ${({ $active }) =>
    $active ? 'rgba(37, 99, 235, 0.35)' : 'rgba(15, 23, 42, 0.65)'};
  border: 1px solid
    ${({ $active }) =>
      $active ? 'rgba(147, 197, 253, 0.6)' : 'rgba(148, 163, 184, 0.3)'};
  color: #e0f2fe;
  padding: 0;
  box-shadow: ${({ $active }) =>
    $active ? '0 18px 34px rgba(8, 47, 73, 0.36)' : '0 14px 28px rgba(8, 47, 73, 0.3)'};
  z-index: 1001;
  transition: background 200ms ease, border-color 200ms ease, box-shadow 200ms ease;

  &:hover,
  &:focus {
    background: rgba(37, 99, 235, 0.45) !important;
    border-color: rgba(147, 197, 253, 0.7);
    color: #f8fafc;
    box-shadow: 0 18px 36px rgba(8, 47, 73, 0.4);
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;

  a {
    color: inherit;
  }

  h5 {
    margin: 0;
    font-size: 1rem;
    letter-spacing: 0.03em;
    font-weight: 600;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.35);
    border-radius: 999px;
  }
`;

const ModelRunsSelect = ({
  isopen,
  handleIsOpen,
  currentMenu
}) => {
  const { backend } = useContext(AppContext);
  const {state,actions} = useModelRunsContext();
  const {actions: hydroFabricActions} = useHydroFabricContext();
  const hasRequestedRef = useRef(false);

  const selectedValue = getRunId(state.current_model_runs?.[0]);

  useEffect(() => {
    if (state.model_runs.length === 0) {
      return;
    }
    if (!state.current_model_runs || state.current_model_runs.length === 0) {
      const first = state.model_runs[0];
      actions.set_current_model_runs([first]);
      const firstId = getRunId(first);
      if (firstId && state.base_model_id !== firstId) {
        actions.set_base_model_id(firstId);
      }
      hydroFabricActions.reset();
    }
    // `actions` and `hydroFabricActions` are stable across renders in this provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.model_runs, state.current_model_runs, state.base_model_id]);

  const handleSelectRun = useCallback((run) => {
    if (!run) return;
    actions.set_current_model_runs([run]);
    const runId = getRunId(run);
    if (runId && runId !== state.base_model_id) {
      actions.set_base_model_id(runId);
    }
    hydroFabricActions.reset();
  }, [actions, state.base_model_id, hydroFabricActions]);



  useEffect(() => {
    if (!isopen) {
      hasRequestedRef.current = false;
      return undefined;
    }

    if (!backend) {
      console.warn('[ModelRunsSelect] backend unavailable; cannot request model runs');
      return undefined;
    }

    if (hasRequestedRef.current) {
      console.log('[ModelRunsSelect] model run request already made for this open session');
      return undefined;
    }

    const sendRequest = () => {
      try {
        console.log('[ModelRunsSelect] requesting workflows visualizations via websocket');
        backend.do(backend.actions.LIST_WORKFLOWS_VISUALIZATIONS, {});
        hasRequestedRef.current = true;
      } catch (err) {
        console.error('[ModelRunsSelect] failed to request model runs', err);
      }
    };

    if (backend.webSocket?.readyState === WebSocket.OPEN) {
      sendRequest();
      return undefined;
    }

    console.log('[ModelRunsSelect] websocket not open; waiting before requesting model runs');
    const interval = setInterval(() => {
      if (backend.webSocket?.readyState === WebSocket.OPEN) {
        sendRequest();
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [isopen, backend]);

  return (
    <Fragment>
          
          <OverlayTrigger
            key={'right'}
            placement={'right'}
            overlay={
              <Tooltip id={`tooltip-right`}>
                Model Runs
              </Tooltip>
            }
          >
            <TogggledButton
              onClick={handleIsOpen}
              $active={isopen}
              $shifted={Boolean(currentMenu)}
            >
              <FaList size={15} />
            </TogggledButton>
          </OverlayTrigger>
          <Container isOpen={isopen}>
            <Content>
              <h5>NGIAB Model Runs Available</h5>
              {state.model_runs.length > 0 ? (
                <ModelRunCards
                  runs={state.model_runs}
                  selectedValue={selectedValue}
                  onSelect={handleSelectRun}
                />
              ) : null}
              <ImportModel />
            </Content>
          </Container>
    </Fragment>

  );
};

export default ModelRunsSelect;

const CARD_BASE_HEIGHT = 300;
const CHIP_ROW_HEIGHT = 40;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  height: 22px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: ${({ $status }) => statusStyles[$status]?.bg || 'rgba(107,114,128,0.35)'};
  color: ${({ $status }) => statusStyles[$status]?.fg || '#e2e8f0'};
  border: 1px solid ${({ $status }) => statusStyles[$status]?.border || 'rgba(156,163,175,0.4)'};
`;

const statusStyles = {
  success: { bg: 'rgba(22,163,74,0.16)', fg: '#bbf7d0', border: 'rgba(34,197,94,0.4)' },
  running: { bg: 'rgba(59,130,246,0.18)', fg: '#c7d2fe', border: 'rgba(96,165,250,0.45)' },
  error: { bg: 'rgba(239,68,68,0.18)', fg: '#fecaca', border: 'rgba(248,113,113,0.4)' },
  failed: { bg: 'rgba(239,68,68,0.18)', fg: '#fecaca', border: 'rgba(248,113,113,0.4)' },
  pending: { bg: 'rgba(250,204,21,0.18)', fg: '#fef08a', border: 'rgba(250,204,21,0.45)' },
};

const CardListOuter = React.forwardRef((props, ref) => (
  <div
    ref={ref}
    {...props}
    style={{
      ...props.style,
      overflowX: 'hidden',
      padding: '6px 2px',
    }}
  />
));

const CardListFrame = styled.div`
  height: 800px;
  border-radius: 20px;
  background: rgba(8, 15, 26, 0.55);
  border: 1px solid rgba(30, 41, 59, 0.45);
  padding: 4px 6px 10px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
`;

const CardButton = styled.button`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 1px solid ${({ $selected }) => ($selected ? 'rgba(96, 165, 250, 0.6)' : 'rgba(148, 163, 184, 0.35)')};
  border-radius: 18px;
  background: ${({ $selected }) => ($selected ? 'rgba(30, 64, 175, 0.9)' : 'rgba(15, 23, 42, 0.92)')};
  color: #e2e8f0;
  display: grid;
  gap: 8px;
  padding: 18px 20px;
  text-align: left;
  cursor: pointer;
  box-shadow: ${({ $selected }) => ($selected ? '0 18px 34px rgba(37, 99, 235, 0.28)' : '0 12px 26px rgba(8, 47, 73, 0.3)')};
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
  min-height: 132px;

  &:hover {
    background: rgba(30, 64, 175, 0.85);
    border-color: rgba(96, 165, 250, 0.65);
    transform: translateY(-2px);
    box-shadow: 0 20px 38px rgba(30, 64, 175, 0.28);
  }

  &:focus {
    outline: none;
    border-color: rgba(147, 197, 253, 0.75);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.32);
  }
`;

const CardTitle = styled.div`
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.015em;
`;

const CardMeta = styled.div`
  font-size: 0.74rem;
  opacity: ${({ $muted }) => ($muted ? 0.6 : 0.78)};
  letter-spacing: 0.01em;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px 14px;
`;

const InfoLabel = styled.div`
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.78);
`;

const InfoValue = styled.div`
  font-size: 0.8rem;
  color: #e2e8f0;
  letter-spacing: 0.01em;
  word-break: break-word;
`;

const NodeStatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`;

const NodeChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${({ $status }) => nodeStatusStyles[$status]?.bg || 'rgba(31,41,55,0.6)'};
  color: ${({ $status }) => nodeStatusStyles[$status]?.fg || '#e2e8f0'};
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid ${({ $status }) => nodeStatusStyles[$status]?.border || 'rgba(148,163,184,0.25)'};
`;

const nodeStatusStyles = {
  success: { bg: 'rgba(22,163,74,0.18)', fg: '#bbf7d0', border: 'rgba(34,197,94,0.4)' },
  running: { bg: 'rgba(59,130,246,0.22)', fg: '#c7d2fe', border: 'rgba(96,165,250,0.45)' },
  error: { bg: 'rgba(239,68,68,0.22)', fg: '#fecaca', border: 'rgba(248,113,113,0.45)' },
  failed: { bg: 'rgba(239,68,68,0.22)', fg: '#fecaca', border: 'rgba(248,113,113,0.45)' },
  pending: { bg: 'rgba(250,204,21,0.22)', fg: '#fef08a', border: 'rgba(250,204,21,0.45)' },
};

const ModelRunCards = ({ runs, selectedValue, onSelect }) => {
  const listRef = useRef(null);
  const itemData = useMemo(() => ({ runs, selectedValue, onSelect }), [runs, selectedValue, onSelect]);
  const listKey = useMemo(() => runs.map((run) => getRunId(run) ?? 'unknown').join('|'), [runs]);
  const itemHeights = useMemo(() => runs.map((run) => {
    let height = CARD_BASE_HEIGHT;
    const nodeCount = Array.isArray(run?.nodes) ? run.nodes.length : 0;
    if (nodeCount > 0) {
      const chipsPerRow = 2;
      const rows = Math.ceil(nodeCount / chipsPerRow);
      height += rows * CHIP_ROW_HEIGHT;
    }
    const selectorNode = run?.nodes?.find((n) => n.kind === 'pre-process') ?? run?.nodes?.[0];
    const cfg = selectorNode?.config ?? {};
    const outputs = [cfg.output_bucket || cfg.bucket, cfg.output_prefix || cfg.output_name || cfg.path]
      .filter(Boolean)
      .join('/');
    if (outputs && outputs.length > 48) {
      height += 24;
    }
    return height;
  }), [runs]);

  const cumulativeHeights = useMemo(() => {
    const totals = [];
    itemHeights.reduce((sum, h, idx) => {
      const next = sum + h;
      totals[idx] = next;
      return next;
    }, 0);
    return totals;
  }, [itemHeights]);

  const initialIndex = useMemo(() => {
    if (!selectedValue) return 0;
    const idx = runs.findIndex((run) => getRunId(run) === selectedValue);
    return idx >= 0 ? idx : 0;
  }, [runs, selectedValue]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0, true);
    }
  }, [itemHeights, listKey]);

  const Row = useCallback(({ index, style, data }) => {
    const run = data.runs[index];
    if (!run) return null;
    const runId = getRunId(run);
    const isSelected = data.selectedValue === runId;
    const handleClick = () => data.onSelect(run);
    const selectorNode = run.nodes?.find((n) => n.kind === 'pre-process') ?? run.nodes?.[0];
    const cfg = selectorNode?.config ?? {};
    const selectorType = cfg.selector_type || selectorNode?.kind;
    const selectorValue = cfg.selector_value;
    const startDate = cfg.start_date;
    const endDate = cfg.end_date;
    const bucket = cfg.output_bucket || cfg.bucket;
    const prefix = cfg.output_prefix || cfg.output_name || cfg.path;
    const lastRun = formatTimestamp(run.last_run_at);
    const created = formatTimestamp(run.created_at);
    const status = (run.status || 'unknown').toLowerCase();
    const runLabel = run.name || run.label || `Model Run ${index + 1}`;
    const shortId = runId ? shortenId(runId) : null;

    const nodeStatuses = Array.isArray(run.nodes) ? run.nodes : [];

    return (
      <div style={{ ...style, padding: '6px 4px', boxSizing: 'border-box' }}>
        <CardButton type="button" onClick={handleClick} $selected={isSelected}>
          <CardHeader>
            <div>
              <CardTitle>{runLabel}</CardTitle>
              {shortId ? <CardMeta $muted>Run ID · {shortId}</CardMeta> : null}
            </div>
            <StatusBadge $status={status}>{status}</StatusBadge>
          </CardHeader>
          <InfoGrid>
            <div>
              <InfoLabel>Last Run</InfoLabel>
              <InfoValue>{lastRun}</InfoValue>
            </div>
            <div>
              <InfoLabel>Outputs</InfoLabel>
              <InfoValue>
                {bucket || prefix ? `${bucket ?? 'bucket?'}${prefix ? ` / ${prefix}` : ''}` : '—'}
              </InfoValue>
            </div>
          </InfoGrid>
          {nodeStatuses.length > 0 ? (
            <NodeStatusRow>
              {nodeStatuses.map((node, nodeIndex) => {
                const nodeStatus = (node.status || 'unknown').toLowerCase();
                return (
                  <NodeChip key={node.id ?? `${node.name}-${nodeIndex}`} $status={nodeStatus} title={node.message || ''}>
                    {node.name || node.kind || 'step'}
                  </NodeChip>
                );
              })}
            </NodeStatusRow>
          ) : null}
        </CardButton>
      </div>
    );
  }, []);

  return (
    <CardListFrame>
      <List
        key={listKey}
        ref={listRef}
        height={500}
        itemCount={runs.length}
        itemSize={(index) => itemHeights[index] ?? CARD_BASE_HEIGHT}
        estimatedItemSize={CARD_BASE_HEIGHT}
        itemData={itemData}
        initialScrollOffset={initialIndex > 0 ? cumulativeHeights[initialIndex - 1] ?? 0 : 0}
        outerElementType={CardListOuter}
        width="100%"
      >
        {Row}
      </List>
    </CardListFrame>
  );
};

const formatTimestamp = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

const shortenId = (id) => {
  if (!id) return '';
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
};

const getRunId = (run) => {
  if (!run) return null;
  return run.id ?? run.value ?? null;
};
