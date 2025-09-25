import React, { Fragment } from 'react';
import styled from 'styled-components';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Button from 'react-bootstrap/Button';
import { GoGraph } from "react-icons/go";

const PANEL_WIDTH = 340;

const ToggleButton = styled(Button)`
  position: absolute;
  top: 300px;
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

const HydroFabricTimeSeriesMenu = ({
  toggleSingleRow,
  currentMenu,
  singleRowOn
}) => {
  
  
  return (
    <Fragment>
            <OverlayTrigger
              key={'right'}
              placement={'right'}
              overlay={
                <Tooltip id={`tooltip-right`}>
                  Time Series
                </Tooltip>
              }
            >
                <ToggleButton
                  $active={!singleRowOn}
                  $shifted={Boolean(currentMenu)}
                  onClick={() => toggleSingleRow(prev => !prev)}
                >
                    <GoGraph size={15} />
                </ToggleButton>
            </OverlayTrigger>
    </Fragment>

  );
};

export default HydroFabricTimeSeriesMenu;
