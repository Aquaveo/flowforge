import React, { Fragment } from 'react';
import styled from 'styled-components';
import HydroFabricSelect from 'features/ngen/components/hydroFabricSelect';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Button from 'react-bootstrap/Button';
import { IoIosOptions  } from "react-icons/io";


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
  gap: 16px;
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
  top: 200px;
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

  h5 {
    margin: 0;
    font-size: 1rem;
    letter-spacing: 0.03em;
    font-weight: 600;
    color: inherit;
  }
`;



const HydroFabricSelectMenu = ({
  isopen,
  handleIsOpen,
  toggleSingleRow,
  setIsLoading,
  currentMenu
}) => {
  
  
  return (
    <Fragment>
          <OverlayTrigger
            key={'right'}
            placement={'right'}
            overlay={
              <Tooltip id={`tooltip-right`}>
                HydroFabric Menu
              </Tooltip>
            }
          >
            <TogggledButton
              onClick={handleIsOpen}
              $active={isopen}
              $shifted={Boolean(currentMenu)}
            >
               <IoIosOptions size={15} />
            </TogggledButton>
          </OverlayTrigger>
          <Container isOpen={isopen}>
            <Content>
                <HydroFabricSelect
                    isOpen={isopen}
                    toggleSingleRow={toggleSingleRow}
                    setIsLoading={setIsLoading}
                />
            </Content>
          </Container>
    </Fragment>

  );
};

export default HydroFabricSelectMenu;
