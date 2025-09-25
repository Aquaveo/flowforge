import React, { Fragment, useEffect, useState } from 'react';

import HydrofabricLayerMenu from 'features/ngen/components/hydroFabricLayerMenu';
import HydroFabricSelectMenu from 'features/ngen/components/hydroFabricSelectMenu';
import HydroFabricTimeSeriesMenu from 'features/ngen/components/hydroFabricTimeSeriesMenu';
const MENUS = {
  MODEL_RUNS: 'modelRuns',
  HYDRO_LAYER: 'hydroLayer',
  HYDRO_SELECT: 'hydroSelect',
};

const NgenMenuWrapper = ({
  toggleSingleRow,
  setIsLoading,
  setIsNgenMenuOpen,
  singleRowOn,
  MenuComponent,
}) => {
  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    setIsNgenMenuOpen?.(Boolean(activeMenu));
  }, [activeMenu, setIsNgenMenuOpen]);

  const toggleMenu = (menuKey) => {
    setActiveMenu((previous) => (previous === menuKey ? null : menuKey));
  };

  const isWrapperMenuOpen = activeMenu === MENUS.MODEL_RUNS;
  const isHydroFabricLayerOpen = activeMenu === MENUS.HYDRO_LAYER;
  const isHydroFabricSelectOpen = activeMenu === MENUS.HYDRO_SELECT;

  return (
    <Fragment>
      <MenuComponent
        isopen={isWrapperMenuOpen}
        handleIsOpen={() => toggleMenu(MENUS.MODEL_RUNS)}
        currentMenu={activeMenu}
      />

      <HydrofabricLayerMenu
        isopen={isHydroFabricLayerOpen}
        handleIsOpen={() => toggleMenu(MENUS.HYDRO_LAYER)}
        currentMenu={activeMenu}
      />

      <HydroFabricSelectMenu
        isopen={isHydroFabricSelectOpen}
        handleIsOpen={() => toggleMenu(MENUS.HYDRO_SELECT)}
        toggleSingleRow={toggleSingleRow}
        setIsLoading={setIsLoading}
        currentMenu={activeMenu}
      />

      <HydroFabricTimeSeriesMenu
        toggleSingleRow={toggleSingleRow}
        currentMenu={activeMenu}
        singleRowOn={singleRowOn}
      />
    </Fragment>

  );
};

export default NgenMenuWrapper;
