import { useState, Suspense } from 'react';
import { HydroFabricProvider } from 'features/hydroFabric/providers/hydroFabricProvider';
import { ModelRunsProvider } from 'features/ModelRuns/providers/modelRunsProvider';
import { HydroFabricContainer, MapContainer } from 'components/StyledContainers';
import { ToastContainer } from 'react-toastify';
import styled from 'styled-components';
import LoadingAnimation from 'components/loader/LoadingAnimation';
import HydroFabricView from './hydroFabricView.js';
import MapComponent from 'features/Map/components/mapgl.js';
import ModelRunMenuView from 'features/ModelRuns/views/modelRunMenuView';

const ViewContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const MapExperience = ({
  singleRowOn,
  toggleSingleRow,
  setIsLoading,
  isModelRunListOpen,
  setIsModelRunListOpen,
}) => (
  <>
    <MapContainer $fullScreen={singleRowOn}>
      <MapComponent />
    </MapContainer>
    <ModelRunMenuView
      toggleSingleRow={toggleSingleRow}
      setIsLoading={setIsLoading}
      setIsMenuOpen={setIsModelRunListOpen}
      singleRowOn={singleRowOn}
    />
    <HydroFabricContainer
      $fullScreen={singleRowOn}
      isModelRunListOpen={isModelRunListOpen}
    >
      <Suspense fallback={<LoadingAnimation />}>
        <HydroFabricView singleRowOn={singleRowOn} />
      </Suspense>
    </HydroFabricContainer>
  </>
);

const NGIABView = () => {
  const [singleRowOn, toggleSingleRow] = useState(true);
  const [isModelRunListOpen, setIsModelRunListOpen] = useState(true);
  const [_, setIsLoading] = useState(false);

  return (
    <ViewContainer>
      <ModelRunsProvider>
        <HydroFabricProvider>
          <ToastContainer stacked />
          <MapExperience
            singleRowOn={singleRowOn}
            toggleSingleRow={toggleSingleRow}
            setIsLoading={setIsLoading}
            isModelRunListOpen={isModelRunListOpen}
            setIsModelRunListOpen={setIsModelRunListOpen}
          />
        </HydroFabricProvider>
      </ModelRunsProvider>
    </ViewContainer>
  );
};

export default NGIABView;
