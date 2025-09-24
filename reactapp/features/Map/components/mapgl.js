import React, { useEffect, useState, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import { Protocol } from 'pmtiles';
import appAPI from 'services/api/app';
import { useHydroFabricContext } from 'features/hydroFabric/hooks/useHydroFabricContext';
import { useModelRunsContext } from 'features/ModelRuns/hooks/useModelRunsContext';
import useTheme from 'hooks/useTheme';
import { toast } from 'react-toastify';

// Register PMTiles protocol once at module scope
const _pmtilesProtocol = new Protocol({ metadata: true });
maplibregl.addProtocol('pmtiles', _pmtilesProtocol.tile);

const onMapLoad = (event) => {
  const map = event.target;

  // pointer interactions
  const hoverLayers = ['catchments-layer', 'catchments-layer-ng', 'nexus-points'];
  hoverLayers.forEach((layer) => {
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
  });

  // bring certain layers to front if present
  ['unclustered-point', 'clusters', 'cluster-count'].forEach((layerId) => {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  });

  // optional empty filters at load (harmless if layer not yet mounted)
  if (map.getLayer('catchments-layer')) {
    map.setFilter('catchments-layer', ['any', ['in', 'divide_id', '']]);
  }
  if (map.getLayer('catchments-layer-ng')) {
    // map.setFilter('catchments-layer-ng', ['any', ['in', 'divide_id', '']]);
  }
  if (map.getLayer('flowpaths-layer')) {
    map.setFilter('flowpaths-layer', ['any', ['in', 'id', '']]);
  }
  if (map.getLayer('flowpaths-layer-ng')) {
    map.setFilter('flowpaths-layer-ng', ['any', ['in', 'id', '']]);
  }

  // keep highlights on top
  ['nexus-highlight', 'catchment-highlight'].forEach((layerId) => {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  });
};

const MapComponent = () => {
  const { state: hydroFabricState, actions: hydroFabricActions } = useHydroFabricContext();
  const { state: modelRunsState } = useModelRunsContext();
  const theme = useTheme();
  const mapRef = useRef(null);

  // highlight
  const [selectedNexusId, setSelectedNexusId] = useState(null);
  const [selectedCatchmentId, setSelectedCatchmentId] = useState(null);

  // data / filters (from API)
  const [nexusPoints, setNexusPoints] = useState(null); // kept for bounds + legacy, not used for drawing
  const [catchmentsFilterIds, setCatchmentsFilterIds] = useState(null);
  const [flowPathsFilterIds, setFlowPathsFilterIds] = useState(null);
  const [nexusFilterIds, setNexusFilterIds] = useState(null);

  // store-derived toggles
  const isClustered = hydroFabricState.nexus.geometry.clustered; // not used with vector tiles, but kept if UI toggles this
  const isNexusHidden = hydroFabricState.nexus.geometry.hidden;
  const isCatchmentHidden = hydroFabricState.catchment.geometry.hidden;

  const mapStyleUrl =
    theme === 'dark'
      ? 'https://communityhydrofabric.s3.us-east-1.amazonaws.com/map/styles/dark-style.json'
      : 'https://communityhydrofabric.s3.us-east-1.amazonaws.com/map/styles/light-style.json';

  // helper: normalize id arrays to strings for robust GL filters
  const asStr = (arr) => (Array.isArray(arr) ? arr.map((v) => String(v)) : []);

  // Community HydroFabric catchments (old source)
  const catchmentConfig = useMemo(() => {
    if (!catchmentsFilterIds) return null;
    return {
      id: 'catchments-layer',
      type: 'fill',
      source: 'conus',
      'source-layer': 'conus_divides',
      filter: [
        'match',
        ['to-string', ['get', 'divide_id']],
        ['literal', asStr(catchmentsFilterIds)],
        true,
        false
      ],
      paint: {
        'fill-color': theme === 'dark'
          ? 'rgba(238, 51, 119, 0.316)'
          : 'rgba(91, 44, 111, 0.316)',
        'fill-outline-color': theme === 'dark'
          ? 'rgba(238, 51, 119, 0.7)'
          : 'rgba(91, 44, 111, 0.7)',
        'fill-opacity': { stops: [[7, 0], [11, 1]] },
      },
      layout: { visibility: isCatchmentHidden ? 'none' : 'visible' },
    };
  }, [catchmentsFilterIds, theme, isCatchmentHidden]);

  // Community HydroFabric flowpaths (old source)
  const flowPathsConfig = useMemo(() => {
    if (!flowPathsFilterIds) return null;
    return {
      id: 'flowpaths-layer',
      type: 'line',
      source: 'conus',
      'source-layer': 'conus_flowpaths',
      filter: [
        'match',
        ['to-string', ['get', 'id']],
        ['literal', asStr(flowPathsFilterIds)],
        true,
        false
      ],
      paint: {
        'line-color': theme === 'dark' ? '#0077bb' : '#000000',
        'line-width': { stops: [[7, 1], [10, 2]] },
        'line-opacity': { stops: [[7, 0], [11, 1]] },
      }
    };
  }, [flowPathsFilterIds, theme]);

  // Community HydroFabric gauges (old source)
  const conusGaugesConfig = useMemo(() => {
    if (!nexusFilterIds) return null;
    return {
      id: 'gauges-layer',
      type: 'circle',
      source: 'conus',
      'source-layer': 'conus_gages',
      filter: [
        'match',
        ['to-string', ['get', 'nex_id']],
        ['literal', asStr(nexusFilterIds)],
        true,
        false
      ],
      paint: {
        'circle-radius': { stops: [[3, 2], [11, 5]] },
        'circle-color': theme === 'dark' ? '#c8c8c8' : '#646464',
        'circle-opacity': { stops: [[3, 0], [9, 1]] },
      }
    };
  }, [nexusFilterIds, theme]);

  // Nexus (new source from PMTiles)
  const nexusLayers = useMemo(() => {
    if (isNexusHidden) return null;
    return [
      <Layer
        key="nexus-points"
        id="nexus-points"
        type="circle"
        source="ngiab"
        source-layer="nexus"
        paint={{
          'circle-color': theme === 'dark' ? '#4f5b67' : '#1f78b4',
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': theme === 'dark' ? '#e9ecef' : '#ffffff',
        }}
      />,
      <Layer
        key="nexus-highlight"
        id="nexus-highlight"
        type="circle"
        source="ngiab"
        source-layer="nexus"
        filter={
          selectedNexusId
            ? ['==', ['get', 'id'], selectedNexusId]
            : ['==', ['get', 'id'], '']
        }
        paint={{
          'circle-radius': 10,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-color': '#ff0000',
        }}
      />,
    ];
  }, [isNexusHidden, theme, selectedNexusId]);

  // NEW: ngiab catchments/flowpaths from PMTiles
  const ngiabCatchmentConfig = useMemo(() => {
    if (!catchmentsFilterIds) return null;
    const ids = asStr(catchmentsFilterIds);
    const attr = [
      'coalesce',
      ['to-string', ['get', 'divide_id']],
      ['to-string', ['get', 'id']],
      ['to-string', ['get', 'Divide_ID']],
      ['to-string', ['get', 'DivideID']],
      ''
    ];
    const filter = ids.length
      ? ['match', attr, ['literal', ids], true, false]
      : null;

    return {
      id: 'catchments-layer-ng',
      type: 'fill',
      source: 'ngiab',
      'source-layer': 'divides',
      ...(filter ? { filter } : {}),
      paint: {
        'fill-color': theme === 'dark'
          ? 'rgba(238, 51, 119, 0.316)'
          : 'rgba(91, 44, 111, 0.316)',
        'fill-outline-color': theme === 'dark'
          ? 'rgba(238, 51, 119, 0.7)'
          : 'rgba(91, 44, 111, 0.7)',
        'fill-opacity': 0.35,
      },
      layout: { visibility: isCatchmentHidden ? 'none' : 'visible' },
    };
  }, [catchmentsFilterIds, theme, isCatchmentHidden]);

  const ngiabFlowPathsConfig = useMemo(() => {
    if (!flowPathsFilterIds) return null;
    const ids = asStr(flowPathsFilterIds);
    const attr = [
      'coalesce',
      ['to-string', ['get', 'id']],
      ['to-string', ['get', 'identifier']],
      ['to-string', ['get', 'divide_id']],
      ['to-string', ['get', 'toid']],
      ''
    ];
    const filter = ids.length
      ? ['match', attr, ['literal', ids], true, false]
      : null;

    return {
      id: 'flowpaths-layer-ng',
      type: 'line',
      source: 'ngiab',
      'source-layer': 'flowpaths',
      ...(filter ? { filter } : {}),
      paint: {
        'line-color': theme === 'dark' ? '#0077bb' : '#000000',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 0.5,
          8, 1.25,
          12, 2.5
        ],
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 0.2,
          8, 0.6,
          12, 0.95
        ],
      },
    };
  }, [flowPathsFilterIds, theme]);

  // fetch geospatial ids + bounds
  useEffect(() => {
    if (!modelRunsState.base_model_id) return;

    appAPI.getGeoSpatialData({ model_run_id: modelRunsState.base_model_id })
      .then((response) => {
        if (response.error) {
          toast.error("Error fetching Model Run Data", { autoClose: 1000 });
          hydroFabricActions.reset();
          setNexusPoints(null);
          setCatchmentsFilterIds(null);
          setFlowPathsFilterIds(null);
          setNexusFilterIds(null);
          setSelectedCatchmentId(null);
          setSelectedNexusId(null);
          return;
        }

        toast.success("Successfully retrieved Model Run Data", { autoClose: 1000 });
        setNexusPoints(response.nexus);
        setCatchmentsFilterIds(response.catchments);
        setFlowPathsFilterIds(response.flow_paths_ids);
        setNexusFilterIds(response.nexus_ids);

        if (response.bounds && mapRef.current) {
          mapRef.current.fitBounds(response.bounds, {
            padding: 20,
            duration: 1000,
          });
        }
      })
      .catch((error) => {
        console.error('Geospatial data fetch failed:', error);
      });

    // no protocol cleanup – keep global registration
  }, [theme, modelRunsState.base_model_id, hydroFabricActions]);

  // clicks
  const handleMapClick = async (event) => {
    const map = event.target;
    const layersToQuery = [];
    if (!isNexusHidden && map.getLayer('nexus-points')) {
      layersToQuery.push('nexus-points');
    }
    if (!isCatchmentHidden) {
      if (map.getLayer('catchments-layer-ng')) layersToQuery.push('catchments-layer-ng');
      if (map.getLayer('catchments-layer')) layersToQuery.push('catchments-layer');
    }
    if (layersToQuery.length === 0) return;

    const features = map.queryRenderedFeatures(event.point, { layers: layersToQuery });
    if (!features || !features.length) return;

    for (const feature of features) {
      const layerId = feature.layer.id;

      if (layerId === 'nexus-points') {
        hydroFabricActions.reset_teehr();
        hydroFabricActions.reset_troute();

        const nexusId = feature.properties.id;
        hydroFabricActions.set_nexus_id(nexusId);
        hydroFabricActions.set_troute_id(nexusId);
        setSelectedNexusId(nexusId);
        setSelectedCatchmentId(null);

        if (!isNexusHidden) {
          hydroFabricActions.show_nexus_geometry();
        }
        if (feature.properties.ngen_usgs && feature.properties.ngen_usgs !== 'none') {
          hydroFabricActions.set_teehr_id(feature.properties.ngen_usgs);
        }
        return;
      }

      if (layerId === 'catchments-layer' || layerId === 'catchments-layer-ng') {
        hydroFabricActions.reset_teehr();
        hydroFabricActions.reset_troute();

        const divideId = feature.properties.divide_id;
        hydroFabricActions.set_catchment_id(divideId);
        hydroFabricActions.set_troute_id(divideId);
        setSelectedCatchmentId(divideId);
        setSelectedNexusId(null);

        if (!isCatchmentHidden) {
          hydroFabricActions.show_catchment_geometry();
        }
        return;
      }
    }
  };

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: -96, latitude: 40, zoom: 4 }}
      style={{ width: '100%', height: '100%' }}
      mapLib={maplibregl}
      mapStyle={mapStyleUrl}
      onClick={handleMapClick}
      onLoad={onMapLoad}
    >
      <Source
        id="conus"
        type="vector"
        url="pmtiles://https://communityhydrofabric.s3.us-east-1.amazonaws.com/map/merged.pmtiles"
      >
        {catchmentConfig && <Layer {...catchmentConfig} />}
        {flowPathsConfig && <Layer {...flowPathsConfig} />}
        {conusGaugesConfig && <Layer {...conusGaugesConfig} />}
        <Layer
          id="catchment-highlight"
          type="fill"
          source="conus"
          source-layer="conus_divides"
          filter={
            selectedCatchmentId
              ? ['==', ['get', 'divide_id'], selectedCatchmentId]
              : ['==', ['get', 'divide_id'], '']
          }
          paint={{
            'fill-color': '#ff0000',
            'fill-outline-color': '#ffffff',
            'fill-opacity': 0.5,
          }}
          layout={{ visibility: isCatchmentHidden ? 'none' : 'visible' }}
        />
      </Source>

      {/* New NGIAB PMTiles source (divides, flowpaths, nexus) */}
      <Source
        id="ngiab"
        type="vector"
        url="pmtiles://https://ngiab.s3.us-east-1.amazonaws.com/config/ngiab_subset.pmtiles"
      >
        {ngiabCatchmentConfig && <Layer {...ngiabCatchmentConfig} />}
        {ngiabFlowPathsConfig && <Layer {...ngiabFlowPathsConfig} />}
        {nexusLayers}
      </Source>
    </Map>
  );
};

export default MapComponent;
