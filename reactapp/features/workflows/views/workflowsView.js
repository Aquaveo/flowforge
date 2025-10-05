// features/workflows/views/workflowsView.js
import React, { useState } from 'react';
import styled from 'styled-components';

import Workflow from '../components/workflow';
import { useWorkflows } from '../hooks/useWorkflowsContext';

import {
  FaTrashAlt,
  FaPlay,
  FaPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaRegCircle,
  FaChevronDown,
} from 'react-icons/fa';
import { LuAlignVerticalJustifyStart, LuAlignStartVertical } from 'react-icons/lu';

import { WorkflowsProvider } from '../providers/workflowsProvider';

import Select, { components as RSComponents } from 'react-select';
import { FixedSizeList as List } from 'react-window';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@xyflow/react/dist/style.css';

const Layout = styled.div`
  display: flex;
  gap: ${(props) => (props.$sidebarVisible ? '18px' : '0')};
  align-items: flex-start;
`;

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  width: 360px;
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(160deg, rgba(12, 19, 33, 0.92), rgba(10, 21, 40, 0.78));
  border: 1px solid rgba(59, 130, 246, 0.18);
  box-shadow: 0 18px 36px rgba(8, 47, 73, 0.25);
  position: sticky;
  top: 24px;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  backdrop-filter: blur(10px);
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  pointer-events: ${(props) => (props.$visible ? 'auto' : 'none')};
  transform: translateX(${(props) => (props.$visible ? '0' : '-40px')});
  transition: opacity 220ms ease, transform 220ms ease;
`;

const SectionCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(71, 85, 105, 0.45);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.08);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #f8fafc;
`;

const SectionSubtitle = styled.span`
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.8);
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${(props) => props.$bg || 'rgba(30, 64, 175, 0.35)'};
  color: ${(props) => props.$color || '#e0f2fe'};
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const ControlsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
`;

const IconButton = styled.button`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid
    ${(props) => (props.$variant === 'danger' ? 'rgba(248,113,113,0.65)' : 'rgba(59,130,246,0.45)')};
  background: rgba(15, 23, 42, 0.75);
  color: ${(props) => (props.$variant === 'danger' ? '#fecaca' : '#dbeafe')};
  box-shadow: 0 4px 12px rgba(8, 47, 73, 0.2);
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color:
      ${(props) => (props.$variant === 'danger' ? 'rgba(248,113,113,0.8)' : 'rgba(96,165,250,0.8)')};
    box-shadow: 0 8px 16px rgba(8, 47, 73, 0.35);
  }
`;

const NodeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
`;

const NodeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(37, 99, 235, 0.35);
  background: rgba(17, 24, 39, 0.85);
  color: #e2e8f0;
  font-weight: 500;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(147, 197, 253, 0.85);
    background: rgba(23, 37, 84, 0.95);
  }
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`;

const TemplateCard = styled.button.attrs({ type: 'button' })`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.22);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.9), rgba(12, 20, 33, 0.82));
  color: #e2e8f0;
  box-shadow: 0 12px 24px rgba(8, 47, 73, 0.18);
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  text-align: left;

  &:hover,
  &:focus {
    outline: none;
    transform: translateY(-2px);
    border-color: rgba(147, 197, 253, 0.7);
    box-shadow: 0 16px 32px rgba(8, 47, 73, 0.28);
  }
`;

const TemplateHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
`;

const TemplateName = styled.h4`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #f8fafc;
  letter-spacing: 0.01em;
`;

const TemplateDescription = styled.p`
  margin: 0;
  font-size: 0.8rem;
  color: rgba(203, 213, 225, 0.8);
  line-height: 1.4;
`;

const StepsFlow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`;

const StepChip = styled.span`
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(30, 64, 175, 0.32);
  border: 1px solid rgba(96, 165, 250, 0.4);
  color: #e0f2fe;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.03em;
`;

const StepConnector = styled.span`
  color: rgba(148, 163, 184, 0.7);
  font-size: 0.75rem;
`;

const SectionHeading = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TemplateToggleButton = styled.button.attrs({ type: 'button' })`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: rgba(17, 24, 39, 0.7);
  color: #bfdbfe;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;

  svg {
    transition: transform 160ms ease;
    transform: rotate(${(props) => (props.$open ? '0deg' : '-90deg')});
  }

  &:hover,
  &:focus {
    outline: none;
    border-color: rgba(147, 197, 253, 0.65);
    background: rgba(23, 37, 84, 0.85);
  }
`;

const TemplateCollapse = styled.div`
  overflow: hidden;
  max-height: ${(props) => (props.$open ? '800px' : '0')};
  opacity: ${(props) => (props.$open ? 1 : 0)};
  padding-top: ${(props) => (props.$open ? '12px' : '0')};
  transition: max-height 220ms ease, opacity 180ms ease, padding-top 180ms ease;
  pointer-events: ${(props) => (props.$open ? 'auto' : 'none')};
`;

const FooterStatus = styled.div`
  margin-top: auto;
  font-size: 0.72rem;
  color: rgba(148, 163, 184, 0.75);
  letter-spacing: 0.04em;
`;

const CanvasColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LayersCard = styled(SectionCard)`
  background: rgba(15, 23, 42, 0.72);
`;

const selectStyles = {
  control: (base) => ({
    ...base,
    background: 'rgba(17, 24, 39, 0.9)',
    borderColor: 'rgba(71, 85, 105, 0.7)',
    color: '#e5e7eb',
    borderRadius: 12,
    minHeight: 44,
    padding: '2px 8px',
    boxShadow: 'none',
  }),
  singleValue: (base) => ({ ...base, color: '#f8fafc' }),
  menu: (base) => ({ ...base, background: 'rgba(15, 23, 42, 0.98)', color: '#e5e7eb' }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
    color: '#f8fafc',
    padding: '10px 12px'
  }),
  menuList: (base) => ({ ...base, padding: 0, overflowY: 'hidden' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const TemplateGallery = ({ templates, onChoose }) => (
  <TemplateGrid>
    {templates.map((template) => (
      <TemplateCard key={template.id} onClick={() => onChoose(template.id)}>
        <TemplateHeader>
          <TemplateName>{template.name}</TemplateName>
        </TemplateHeader>
        <TemplateDescription>{template.description}</TemplateDescription>
        <StepsFlow>
          {template.steps.map((step, index) => (
            <React.Fragment key={step}>
              <StepChip>{step}</StepChip>
              {index < template.steps.length - 1 && <StepConnector>→</StepConnector>}
            </React.Fragment>
          ))}
        </StepsFlow>
      </TemplateCard>
    ))}
  </TemplateGrid>
);

const selectTheme = (theme) => ({
  ...theme,
  colors: {
    ...theme.colors,
    primary25: 'rgba(37, 99, 235, 0.2)',
    primary: '#60a5fa',
  },
});

const STATUS_THEME = {
  success: { bg: 'rgba(34, 197, 94, 0.18)', color: '#bbf7d0', label: 'Success' },
  error: { bg: 'rgba(248, 113, 113, 0.18)', color: '#fecaca', label: 'Error' },
  running: { bg: 'rgba(250, 204, 21, 0.18)', color: '#fef08a', label: 'Running' },
  queued: { bg: 'rgba(253, 186, 116, 0.18)', color: '#fde68a', label: 'Queued' },
  idle: { bg: 'rgba(59, 130, 246, 0.18)', color: '#dbeafe', label: 'Idle' },
};

function Toolbar({ sidebarVisible }) {
  const {
    addNode,
    removeSelected,
    autoLayout,
    runWorkflow,
    setSelectedWorkflow,
    state,
    applyTemplate,
  } = useWorkflows();

  const [templatesOpen, setTemplatesOpen] = useState(true);

  const TEMPLATE_OPTIONS = [
    {
      id: 'pre->cfg',
      name: 'Pre-process & Calibration Configuration',
      steps: ['pre-process', 'calibration-config'],
      description: 'Get inputs ready and configure calibration.',
    },
    {
      id: 'pre->cfg->cal',
      name: 'Pre-process & Calibration Run',
      steps: ['pre-process', 'calibration-config', 'calibration-run'],
      description: 'Prepare inputs, configure calibration, and run it end-to-end.',
    },
    {
      id: 'pre->cfg->cal->run',
      name: 'Pre-process, Calibrate & Run NGIAB',
      steps: ['pre-process', 'calibration-config', 'calibration-run', 'ngiab-run'],
      description: 'Complete calibration steps then execute the NGIAB model run.',
    },
    {
      id: 'pre->cfg->cal->run->teehr',
      name: 'Full Pipeline with TEEHR',
      steps: ['pre-process', 'calibration-config', 'calibration-run', 'ngiab-run', 'ngiab-teehr'],
      description: 'Run the full pipeline from preprocessing through NGIAB execution and generate a TEEHR report.',
    },
  ];

  const MenuListVirtualized = (props) => {
    const { children, maxHeight, getStyles, innerProps } = props;
    const itemCount = Array.isArray(children) ? children.length : 0;
    const rowHeight = 56;
    const height = Math.min(maxHeight, itemCount * rowHeight);

    return (
      <div {...innerProps} style={{ ...getStyles('menuList', props), padding: 0, overflowY: 'hidden' }}>
        <List height={height} itemCount={itemCount} itemSize={rowHeight} width="100%">
          {({ index, style }) => <div style={style}>{children[index]}</div>}
        </List>
      </div>
    );
  };

  const list = [...(state.workflows || [])].sort((a, b) => {
    const da = a.last_run_at ? new Date(a.last_run_at).getTime() : -Infinity;
    const db = b.last_run_at ? new Date(b.last_run_at).getTime() : -Infinity;
    return db - da;
  });

  const iconFor = (status) => {
    if (status === 'success') return <FaCheckCircle style={{ opacity: 0.9 }} />;
    if (status === 'error') return <FaTimesCircle style={{ opacity: 0.9 }} />;
    if (status === 'running' || status === 'queued') return <FaHourglassHalf style={{ opacity: 0.9 }} />;
    return <FaRegCircle style={{ opacity: 0.6 }} />;
  };

  const options = list.map((workflow) => ({
    value: String(workflow.id),
    label: workflow.name,
    status: workflow.status,
    lastRunAt: workflow.last_run_at || null,
  }));

  const selected = options.find((o) => o.value === state.ui?.selectedWorkflowId) || null;

  const StatusOption = (props) => {
    const { data } = props;
    return (
      <RSComponents.Option {...props}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {iconFor(data.status)}
          <span>{data.label}</span>
        </div>
      </RSComponents.Option>
    );
  };

  const StatusSingleValue = (props) => {
    const { data } = props;
    return (
      <RSComponents.SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {iconFor(data.status)}
          <span>{data.label}</span>
        </div>
      </RSComponents.SingleValue>
    );
  };

  const selectedWorkflowMeta = state.workflows?.find(
    (workflow) => String(workflow.id) === state.ui?.selectedWorkflowId
  );

  const statusTheme = STATUS_THEME[selectedWorkflowMeta?.status || 'idle'];
  const lastRunLabel = selectedWorkflowMeta?.last_run_at
    ? new Date(selectedWorkflowMeta.last_run_at).toLocaleString()
    : 'No runs yet';

  const nodeButtons = [
    { label: 'pre-process', value: 'pre-process' },
    { label: 'calibration config', value: 'calibration-config' },
    { label: 'calibration run', value: 'calibration-run' },
    { label: 'run ngiab', value: 'run-ngiab' },
    { label: 'teehr', value: 'teehr' },
  ];

  return (
    <Sidebar $visible={sidebarVisible}>
      <SectionCard>
        <SectionHeader>
          <SectionTitle>My Workflows</SectionTitle>
          {selectedWorkflowMeta ? (
            <StatusPill $bg={statusTheme.bg} $color={statusTheme.color}>
              {statusTheme.label}
            </StatusPill>
          ) : null}
        </SectionHeader>
        <SectionSubtitle>
          {selectedWorkflowMeta ? `Last run · ${lastRunLabel}` : 'Select a workflow to view status'}
        </SectionSubtitle>
        <Select
          options={options}
          value={selected}
          onChange={(opt) => setSelectedWorkflow(opt?.value ?? null)}
          placeholder="Search your workspace…"
          components={{
            MenuList: MenuListVirtualized,
            Option: StatusOption,
            SingleValue: StatusSingleValue,
          }}
          isClearable
          menuPortalTarget={document.body}
          menuPosition="fixed"
          styles={selectStyles}
          theme={selectTheme}
        />
      </SectionCard>

      {/* <SectionCard>
        <SectionHeader>
          <SectionHeading>
            <SectionTitle>Templates</SectionTitle>
            <SectionSubtitle>Start from a proven pattern</SectionSubtitle>
          </SectionHeading>
          <TemplateToggleButton
            onClick={() => setTemplatesOpen((open) => !open)}
            aria-expanded={templatesOpen}
            aria-controls="workflow-template-gallery"
            $open={templatesOpen}
          >
            <FaChevronDown aria-hidden="true" />
          </TemplateToggleButton>
        </SectionHeader>
        <TemplateCollapse $open={templatesOpen} id="workflow-template-gallery">
          <TemplateGallery templates={TEMPLATE_OPTIONS} onChoose={applyTemplate} />
        </TemplateCollapse>
      </SectionCard> */}

      <SectionCard>
        <SectionHeader>
          <SectionTitle>Tools</SectionTitle>
          <SectionSubtitle>Layout & execution controls</SectionSubtitle>
        </SectionHeader>
        <ControlsRow>
          <IconButton onClick={removeSelected} $variant="danger" aria-label="Remove selected">
            <FaTrashAlt />
          </IconButton>
          <IconButton onClick={() => autoLayout('LR')} aria-label="Auto layout left to right">
            <LuAlignVerticalJustifyStart />
          </IconButton>
          <IconButton onClick={() => autoLayout('TB')} aria-label="Auto layout top to bottom">
            <LuAlignStartVertical />
          </IconButton>
          <IconButton onClick={runWorkflow} aria-label="Run workflow">
            <FaPlay />
          </IconButton>
        </ControlsRow>
      </SectionCard>

      <SectionCard>
        <SectionHeader>
          <SectionTitle>Build Blocks</SectionTitle>
          <SectionSubtitle>Add steps to your pipeline</SectionSubtitle>
        </SectionHeader>
        <NodeGrid>
          {nodeButtons.map((btn) => (
            <NodeButton key={btn.value} onClick={() => addNode(btn.value)}>
              <FaPlus aria-hidden="true" />
              <span>{btn.label}</span>
            </NodeButton>
          ))}
        </NodeGrid>
      </SectionCard>

      <FooterStatus>
        WS · {state.ws.connected ? 'Connected' : 'Disconnected'}
        {state.ws.error ? ` • ${state.ws.error}` : ''}
      </FooterStatus>
    </Sidebar>
  );
}

function LayersPreview() {
  const { state } = useWorkflows();
  if (!state.layers?.length) return null;
  return (
    <LayersCard>
      <SectionHeader>
        <SectionTitle>Execution plan</SectionTitle>
        <SectionSubtitle>{state.layers.length} stage(s)</SectionSubtitle>
      </SectionHeader>
      <ol style={{ margin: 0, paddingLeft: 18, color: '#cbd5f5' }}>
        {state.layers.map((layer, i) => (
          <li key={i} style={{ marginBottom: 6, fontSize: '0.85rem' }}>
            {layer.join(' → ')}
          </li>
        ))}
      </ol>
    </LayersCard>
  );
}

export default function WorkflowsView({ sidebarVisible = true } = {}) {
  return (
    <WorkflowsProvider>
      <Layout $sidebarVisible={sidebarVisible}>
        <Toolbar sidebarVisible={sidebarVisible} />
        <CanvasColumn>
          <Workflow />
          <LayersPreview />
        </CanvasColumn>
      </Layout>
      <ToastContainer position="top-center" />
    </WorkflowsProvider>
  );
}
