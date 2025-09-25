// containers.js
import styled from 'styled-components';
import useTheme from 'hooks/useTheme';

const LEFT_PANEL_WIDTH = 340;
const HORIZONTAL_MARGIN = 24;
const PANEL_GAP = 24;

// HydroFabricContainer
const StyledHydroFabricContainer = styled.div`
  position: fixed;
  bottom: 32px;
  left: ${(props) =>
    props.$menuOpen
      ? `calc(${HORIZONTAL_MARGIN}px + min(${LEFT_PANEL_WIDTH}px, 100% - ${HORIZONTAL_MARGIN * 2}px) + ${PANEL_GAP}px)`
      : `${HORIZONTAL_MARGIN}px`};
  right: ${HORIZONTAL_MARGIN}px;
  width: auto;
  max-width: ${(props) =>
    props.$menuOpen
      ? `calc(100% - (${HORIZONTAL_MARGIN}px + min(${LEFT_PANEL_WIDTH}px, 100% - ${HORIZONTAL_MARGIN * 2}px) + ${PANEL_GAP}px) - ${HORIZONTAL_MARGIN}px)`
      : `calc(100% - ${HORIZONTAL_MARGIN * 2}px)`};
  min-width: min(320px, calc(100% - ${HORIZONTAL_MARGIN * 2}px));
  padding: 24px 28px;
  border-radius: 24px;
  background: ${(props) =>
    props.theme === 'dark'
      ? 'linear-gradient(160deg, rgba(15, 23, 42, 0.9), rgba(12, 20, 33, 0.72))'
      : 'linear-gradient(160deg, rgba(226, 232, 240, 0.95), rgba(226, 232, 240, 0.78))'};
  border: 1px solid rgba(148, 163, 184, 0.3);
  box-shadow: 0 24px 48px rgba(8, 47, 73, 0.28);
  backdrop-filter: blur(18px);
  color: ${(props) => (props.theme === 'dark' ? '#f8fafc' : '#0f172a')};
  z-index: 1100;
  pointer-events: ${(props) => (props.$fullScreen ? 'none' : 'auto')};
  opacity: ${(props) => (props.$fullScreen ? 0 : 1)};
  transform: ${(props) => (props.$fullScreen ? 'translateY(24px)' : 'translateY(0)')};
  transition: opacity 220ms ease, transform 220ms ease, left 220ms ease, max-width 220ms ease;
  height: ${(props) => (props.$fullScreen ? '0' : '40vh')};
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.35);
    border-radius: 999px;
  }
`;

export const HydroFabricContainer = ({ isModelRunListOpen, ...rest }) => {
  const theme = useTheme();
  return (
    <StyledHydroFabricContainer
      {...rest}
      theme={theme}
      $menuOpen={isModelRunListOpen}
    />
  );
};

// HydroFabricPlotContainer
const StyledHydroFabricPlotContainer = styled.div`
  width: 100%;
  padding: 5px;
  height: 300px;
  order: 1;
  flex: 1 1 80%;
  background-color: ${(props) => props.theme === 'dark' ? '#4f5b67' : '#f9f9f9'};
`;

export const HydroFabricPlotContainer = (props) => {
  const theme = useTheme();
  return <StyledHydroFabricPlotContainer {...props} theme={theme} />;
};

// SelectContainer
const StyledSelectContainer = styled.div`
  display: flex;
  flex-direction: column;
  order: 1;
  width: 100%;
  padding: 5px;
  flex: 1 1 20%;
  background-color: ${(props) =>
    props.theme === 'dark' ? '#4f5b67' : '#ffffff'};
  color: ${(props) => (props.theme === 'dark' ? '#ffffff' : '#000000')};
`;

export const SelectContainer = (props) => {
  const theme = useTheme();
  return <StyledSelectContainer {...props} theme={theme} />;
};

// MapContainer
const StyledMapContainer = styled.div`
  flex: ${(props) => (props.$fullScreen ? '1 1 100%' : '1 1 60%')};
  order: 1;
  width: 100%;
  height: ${(props) => (props.$fullScreen ? '100%' : '60%')};
  background-color: ${(props) =>
    props.theme === 'dark' ? '#1f1f1f' : '#f9f9f9'};
  position: relative;
  overflow: hidden;
`;

export const MapContainer = (props) => {
  const theme = useTheme();
  return <StyledMapContainer {...props} theme={theme} />;
};

// TeehrMetricsWrapper
const StyledTeehrMetricsWrapper = styled.div`
  width: 100%;
  height: 100%;
  padding: 10px;
  background-color: ${(props) =>
    props.theme === 'dark' ? '#4f5b67' : '#f8f8f8'};
  border-bottom: 1px solid
    ${(props) => (props.theme === 'dark' ? '#444444' : '#ddd')};
  display: flex;
  flex-direction: column;
  order: 1;
  flex: 1 1 20%;
  color: ${(props) => (props.theme === 'dark' ? '#ffffff' : '#000000')};
`;

export const TeehrMetricsWrapper = (props) => {
  const theme = useTheme();
  return <StyledTeehrMetricsWrapper {...props} theme={theme} />;
};



const StyledTimeSeriesContainer = styled.div`
    position: absolute;
    display: ${props => props.singleRowOn ? 'none' : 'block'};
    top: 60px;
    left: 0.5rem;
    padding: 10px;
    background-color: ${(props) =>
      props.theme === 'dark' ? '#4f5b67' : '#f8f8f8'};
    ${(props) => (props.theme === 'dark' ? '#444444' : '#ddd')};
    width: 300px;
    border-radius: 0.5rem;  
    color: ${(props) => (props.theme === 'dark' ? '#ffffff' : '#000000')};
`;

export const TimeSeriesContainer = (props) => {
  const theme = useTheme();
  return <StyledTimeSeriesContainer {...props} theme={theme} />;
};
