


import React, { useEffect, useState, Fragment } from 'react';
import styled from 'styled-components';
import Button from 'react-bootstrap/Button';
import { FaList } from "react-icons/fa";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

import { useModelRunsContext } from 'features/ModelRuns/hooks/useModelRunsContext';
import { useHydroFabricContext } from 'features/hydroFabric/hooks/useHydroFabricContext';
import appAPI from 'services/api/app';
import SelectComponent from 'components/selectComponent';
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
    isOpen ? 'translateX(0)' : 'translateX(calc(-110%))'};
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

  const {state,actions} = useModelRunsContext();
  const {actions: hydroFabricActions} = useHydroFabricContext();

  useEffect(() => {
    appAPI.getModelRuns().then((response) => {
      
      actions.set_model_run_list(response.model_runs);
    }).catch((error) => {
      console.log("Error fetching Model Runs", error);
      hydroFabricActions.reset();
    })
    return  () => {
      if(state.model_runs.length < 0) return
      actions.reset();
    }

  }, []);
  
  useEffect(() => {
    hydroFabricActions.reset();
    if (state.current_model_runs.length < 1){
      return
    }
    actions.set_base_model_id(state.current_model_runs[0].value)
    
  }
  , [state.current_model_runs]);

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
              {state.model_runs.length > 0 &&
                  <Fragment>
                      <SelectComponent 
                        optionsList={state.model_runs} 
                        onChangeHandler={actions.set_current_model_runs}
                      />
                  </Fragment>
              }
              <ImportModel />
            </Content>
          </Container>
    </Fragment>

  );
};

export default ModelRunsSelect;
