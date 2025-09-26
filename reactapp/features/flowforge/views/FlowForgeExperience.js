import { useState } from 'react';
import styled from 'styled-components';
import { FaProjectDiagram, FaChartArea } from 'react-icons/fa';

import WorkflowsView from 'features/workflows/views/workflowsView';
import NGIABView from '../../../views/ngiab_view';

const TABS = [
  { key: 'workflows', label: 'Workflows', icon: FaProjectDiagram },
  { key: 'map', label: 'Visualization', icon: FaChartArea },
];

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  // gap: 16px;
`;

const TabStrip = styled.nav`
  position: absolute;
  top: 24px;
  right: 24px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.35), rgba(15, 23, 42, 0.75));
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 14px;
  box-shadow: 0 12px 24px rgba(8, 47, 73, 0.25);
  width: fit-content;
  z-index: 5;
`;

const TabButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  padding: 10px 18px;
  border-radius: 12px;
  border: none;
  background: ${(props) => (props.$active ? 'rgba(37, 99, 235, 0.22)' : 'transparent')};
  color: ${(props) => (props.$active ? '#e0f2fe' : '#9ca3af')};
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 180ms ease;

  &:hover {
    color: #f8fafc;
    background: ${(props) => (props.$active ? 'rgba(37, 99, 235, 0.3)' : 'rgba(30, 64, 175, 0.25)')};
    transform: translateY(-1px);
  }

  svg {
    font-size: 0.9rem;
  }
`;

const ActiveUnderline = styled.span`
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 6px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #38bdf8, #6366f1);
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transform: scaleX(${(props) => (props.$visible ? 1 : 0.5)});
  transform-origin: center;
  transition: opacity 180ms ease, transform 180ms ease;
`;

const PanelsWrapper = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
`;

const Panel = styled.div`
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  pointer-events: ${(props) => (props.$visible ? 'auto' : 'none')};
  transform: translateY(${(props) => (props.$visible ? '0' : '12px')});
  transition: opacity 220ms ease, transform 220ms ease;
  display: flex;
  flex-direction: column;
`;

export default function FlowForgeExperience() {
  const [activeTab, setActiveTab] = useState('workflows');

  return (
    <Container>
      <TabStrip aria-label="FlowForge sections">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = key === activeTab;
          return (
            <TabButton
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              $active={isActive}
            >
              {Icon ? <Icon aria-hidden="true" /> : null}
              <span>{label}</span>
              <ActiveUnderline $visible={isActive} />
            </TabButton>
          );
        })}
      </TabStrip>

      <PanelsWrapper>
        <Panel $visible={activeTab === 'workflows'}>
          <WorkflowsView sidebarVisible={activeTab === 'workflows'} />
        </Panel>
        <Panel $visible={activeTab === 'map'}>
          <NGIABView />
        </Panel>
      </PanelsWrapper>
    </Container>
  );
}
