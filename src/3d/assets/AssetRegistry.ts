export interface AssetCatalogItem3D {
  id: string;
  name: string;
  sector: string;
  category: string;
  subcategory?: string;
  tags: string[];
  assetType: 'parametric' | 'glb' | 'billboard_svg';
  assetUri?: string;
  symbolId?: string; // Matching 2D Industrial Graphics Library Symbol ID
  description: string;
  defaultW: number;
  defaultH: number;
  defaultD: number;
  animatableParts: string[];
  icon: string;
}

export const ASSET_CATALOG_3D: AssetCatalogItem3D[] = [
  // =========================================================================
  // 1. PUMPS & COMPRESSORS
  // =========================================================================
  {
    id: 'pumps.centrifugal.end_suction',
    name: 'Centrifugal End-Suction Pump & Motor Skid',
    sector: 'Pumps & Compressors',
    category: 'End-Suction Pumps',
    tags: ['pump', 'centrifugal', 'volute', 'motor', 'skid', 'process', '3d'],
    assetType: 'parametric',
    symbolId: 'pumps.centrifugal.end_suction.3d',
    description: 'Heavy duty ANSI/ISO horizontal end-suction process pump with electric drive motor and baseplate skid.',
    defaultW: 2.4,
    defaultH: 1.3,
    defaultD: 1.0,
    animatableParts: ['impeller', 'shaft', 'cooling_fan'],
    icon: 'fa-gears'
  },
  {
    id: 'pumps.multistage.horizontal',
    name: 'Horizontal Multi-Stage High-Pressure Pump',
    sector: 'Pumps & Compressors',
    category: 'Multi-Stage Pumps',
    tags: ['pump', 'multistage', 'high pressure', 'feedwater', 'boiler', '3d'],
    assetType: 'parametric',
    symbolId: 'pumps.multistage.horizontal',
    description: 'Ring-section multi-stage high pressure centrifugal pump for boiler feed and water treatment skids.',
    defaultW: 3.2,
    defaultH: 1.4,
    defaultD: 1.1,
    animatableParts: ['impeller', 'shaft', 'cooling_fan'],
    icon: 'fa-gears'
  },
  {
    id: 'pumps.vertical.turbine_sump',
    name: 'Vertical Turbine Sump Pump',
    sector: 'Pumps & Compressors',
    category: 'Vertical Pumps',
    tags: ['pump', 'vertical', 'turbine', 'sump', 'deep well', '3d'],
    assetType: 'parametric',
    symbolId: 'pumps.vertical.turbine_sump.flat2d',
    description: 'Multi-stage deep sump vertical lineshaft turbine pump with discharge head.',
    defaultW: 1.2,
    defaultH: 3.5,
    defaultD: 1.2,
    animatableParts: ['shaft', 'impeller'],
    icon: 'fa-gears'
  },

  // =========================================================================
  // 2. MOTORS & MECHANICAL DRIVES
  // =========================================================================
  {
    id: 'motors.tefc_ac_motor',
    name: 'Foot-Mount TEFC AC Induction Motor',
    sector: 'Motors & Drives',
    category: 'AC Motors',
    tags: ['motor', 'tefc', 'induction', 'electric', 'drive', '3d'],
    assetType: 'parametric',
    symbolId: 'motors.tefc_ac_motor.3d',
    description: 'Totally Enclosed Fan Cooled (TEFC) cast-iron industrial AC electric motor.',
    defaultW: 1.4,
    defaultH: 1.0,
    defaultD: 0.8,
    animatableParts: ['cooling_fan', 'shaft'],
    icon: 'fa-bolt'
  },
  {
    id: 'drives.gearbox_reducer',
    name: 'Industrial Helical Speed Reducer Gearbox',
    sector: 'Motors & Drives',
    category: 'Gearboxes',
    tags: ['gearbox', 'reducer', 'drive', 'speed reducer', 'transmission', '3d'],
    assetType: 'parametric',
    symbolId: 'drives.gearbox_reducer',
    description: 'Heavy duty foot-mounted cast-iron industrial helical gearbox speed reducer with dual shaft extensions.',
    defaultW: 1.5,
    defaultH: 1.2,
    defaultD: 1.0,
    animatableParts: ['input_shaft', 'output_shaft'],
    icon: 'fa-cog'
  },

  // =========================================================================
  // 3. FANS & VENTILATION
  // =========================================================================
  {
    id: 'fans.box_wall_exhaust',
    name: 'Industrial Box Wall Exhaust Fan (Belt Drive & Louvers)',
    sector: 'Fans & Blowers',
    category: 'Wall Exhaust Fans',
    tags: ['exhaust fan', 'wall fan', 'box fan', 'louvers', 'shutters', 'belt drive', 'ventilation', 'marenco', 'agriculture', 'greenhouse', 'hvac', '3d'],
    assetType: 'parametric',
    symbolId: 'fans.box_wall_exhaust',
    description: 'Heavy square-frame wall exhaust fan with 6-blade aerodynamic impeller, corner belt-drive motor, gravity shutter louvers, and wire safety mesh.',
    defaultW: 2.0,
    defaultH: 2.0,
    defaultD: 0.5,
    animatableParts: ['impeller', 'louvers', 'motor'],
    icon: 'fa-fan'
  },
  {
    id: 'fans.vane_axial.heavy_duty',
    name: 'Industrial Tubular Vane Axial Duct Fan',
    sector: 'Fans & Blowers',
    category: 'Vane Axial Fans',
    tags: ['fan', 'vane axial', 'duct', 'tunnel', 'aerofoil', 'ventilation', '3d'],
    assetType: 'parametric',
    symbolId: 'fans.vane_axial.heavy_duty.flat2d',
    description: 'Heavy duty direct-drive inline cylindrical vane axial ventilation fan.',
    defaultW: 1.6,
    defaultH: 1.6,
    defaultD: 1.4,
    animatableParts: ['impeller', 'shaft'],
    icon: 'fa-fan'
  },
  {
    id: 'fans.centrifugal_blower',
    name: 'Centrifugal Industrial Scroll Blower',
    sector: 'Fans & Blowers',
    category: 'Centrifugal Blowers',
    tags: ['blower', 'scroll', 'centrifugal', 'air handling', 'exhaust', '3d'],
    assetType: 'parametric',
    symbolId: 'fans.centrifugal_blower',
    description: 'Heavy scroll housing centrifugal blower with inlet cone and rectangular discharge flange.',
    defaultW: 2.0,
    defaultH: 1.8,
    defaultD: 1.3,
    animatableParts: ['impeller', 'shaft', 'cooling_fan'],
    icon: 'fa-wind'
  },

  // =========================================================================
  // 4. TANKS & PROCESS VESSELS
  // =========================================================================
  {
    id: 'tanks.vertical_storage',
    name: 'Vertical Storage Tank (Dynamic Fluid Level)',
    sector: 'Tanks & Vessels',
    category: 'Storage Tanks',
    tags: ['tank', 'vessel', 'silo', 'storage', 'fluid', 'level', '3d'],
    assetType: 'parametric',
    symbolId: 'tank_vertical',
    description: 'Cylindrical stainless process vessel with top dished head and dynamic animated fluid level.',
    defaultW: 2.4,
    defaultH: 3.8,
    defaultD: 2.4,
    animatableParts: ['liquid'],
    icon: 'fa-oil-can'
  },
  {
    id: 'tanks.horizontal_bullet',
    name: 'Horizontal Pressurized Storage Bullet Vessel',
    sector: 'Tanks & Vessels',
    category: 'Pressure Vessels',
    tags: ['vessel', 'bullet', 'horizontal', 'lpg', 'pressure', 'tank', '3d'],
    assetType: 'parametric',
    symbolId: 'tanks.horizontal_bullet',
    description: 'Horizontal cylindrical pressure vessel with hemispherical heads and saddle supports.',
    defaultW: 4.2,
    defaultH: 2.2,
    defaultD: 1.8,
    animatableParts: ['liquid'],
    icon: 'fa-capsules'
  },
  {
    id: 'tanks.conical_silo',
    name: 'Bulk Storage Silo & Conical Hopper',
    sector: 'Tanks & Vessels',
    category: 'Silos & Hoppers',
    tags: ['silo', 'hopper', 'bulk', 'grain', 'cement', 'conical', '3d'],
    assetType: 'parametric',
    symbolId: 'tanks.conical_silo',
    description: 'Industrial tall cylindrical bulk solids silo with bottom conical discharge cone and support legs.',
    defaultW: 2.6,
    defaultH: 5.2,
    defaultD: 2.6,
    animatableParts: ['level'],
    icon: 'fa-building'
  },
  {
    id: 'tanks.agitator_reactor',
    name: 'Chemical Agitator & Reactor Vessel',
    sector: 'Tanks & Vessels',
    category: 'Agitators & Mixers',
    tags: ['agitator', 'reactor', 'mixer', 'chemical', 'impeller', 'jacketed', '3d'],
    assetType: 'parametric',
    symbolId: 'tanks.agitator_reactor',
    description: 'Jacketed reaction vessel with top-mounted electric gearmotor drive and internal rotating multi-tier turbine impeller.',
    defaultW: 2.4,
    defaultH: 4.5,
    defaultD: 2.4,
    animatableParts: ['agitator_shaft', 'liquid'],
    icon: 'fa-flask'
  },

  // =========================================================================
  // 5. VALVES & ACTUATORS
  // =========================================================================
  {
    id: 'valves.butterfly_wafer',
    name: 'Wafer Butterfly Valve with Pneumatic Actuator',
    sector: 'Valves & Actuators',
    category: 'Butterfly Valves',
    tags: ['valve', 'butterfly', 'wafer', 'actuator', 'pneumatic', 'control', '3d'],
    assetType: 'parametric',
    symbolId: 'valve_control',
    description: 'Industrial wafer pattern disc butterfly valve with pneumatic cylinder actuator.',
    defaultW: 0.8,
    defaultH: 1.8,
    defaultD: 0.6,
    animatableParts: ['valve_disc'],
    icon: 'fa-faucet'
  },
  {
    id: 'valves.globe_control',
    name: 'Globe Control Valve with Diaphragm Actuator & Positioner',
    sector: 'Valves & Actuators',
    category: 'Control Valves',
    tags: ['valve', 'globe', 'diaphragm', 'positioner', 'pneumatic', 'modulating', '3d'],
    assetType: 'parametric',
    symbolId: 'valves.globe_control',
    description: 'Flanged linear globe control valve with top pneumatic spring-diaphragm actuator and smart electro-pneumatic positioner.',
    defaultW: 1.1,
    defaultH: 2.1,
    defaultD: 0.8,
    animatableParts: ['valve_stem', 'plug'],
    icon: 'fa-sliders'
  },
  {
    id: 'valves.motorized_ball',
    name: 'Motorized Flanged Ball Valve with Electric Rotary Actuator',
    sector: 'Valves & Actuators',
    category: 'Ball Valves',
    tags: ['valve', 'ball', 'motorized', 'rotary', 'electric actuator', '3d'],
    assetType: 'parametric',
    symbolId: 'valves.motorized_ball',
    description: 'Two-piece full-bore flanged ball valve equipped with quarter-turn electric motor actuator housing.',
    defaultW: 0.9,
    defaultH: 1.6,
    defaultD: 0.7,
    animatableParts: ['ball_core', 'indicator'],
    icon: 'fa-circle-dot'
  },

  // =========================================================================
  // 6. HEAT EXCHANGERS & THERMAL
  // =========================================================================
  {
    id: 'thermal.shell_tube_exchanger',
    name: 'Industrial Shell & Tube Heat Exchanger',
    sector: 'Heat Exchangers & Boilers',
    category: 'Shell & Tube',
    tags: ['heat exchanger', 'shell and tube', 'cooler', 'condenser', 'thermal', '3d'],
    assetType: 'parametric',
    symbolId: 'thermal.shell_tube_exchanger',
    description: 'TEMA type BEM horizontal shell-and-tube heat exchanger with channel heads, tube sheets, and saddle supports.',
    defaultW: 3.8,
    defaultH: 1.6,
    defaultD: 1.2,
    animatableParts: ['fluid_shell', 'fluid_tubes'],
    icon: 'fa-fire'
  },
  {
    id: 'thermal.plate_heat_exchanger',
    name: 'Gasketed Plate & Frame Heat Exchanger',
    sector: 'Heat Exchangers & Boilers',
    category: 'Plate Exchangers',
    tags: ['heat exchanger', 'plate', 'gasketed', 'thermal', 'hvac', '3d'],
    assetType: 'parametric',
    symbolId: 'thermal.plate_heat_exchanger',
    description: 'Modular corrugated stainless plate pack clamped between fixed and movable frame covers with 4 flanged ports.',
    defaultW: 1.6,
    defaultH: 2.2,
    defaultD: 1.1,
    animatableParts: [],
    icon: 'fa-table-cells'
  },
  {
    id: 'thermal.cooling_tower_cell',
    name: 'Industrial Induced Draft Cooling Tower Cell',
    sector: 'Heat Exchangers & Boilers',
    category: 'Cooling Towers',
    tags: ['cooling tower', 'thermal', 'chiller', 'fan stack', 'louvers', '3d'],
    assetType: 'parametric',
    symbolId: 'thermal.cooling_tower_cell',
    description: 'Counterflow fiberglass cooling tower cell with top aerodynamic fan stack, air intake louvers, and cold water basin.',
    defaultW: 3.0,
    defaultH: 3.6,
    defaultD: 3.0,
    animatableParts: ['fan_blades'],
    icon: 'fa-snowflake'
  },
  {
    id: 'thermal.dual_fan_cooling_tower',
    name: 'Dual-Fan Crossflow Induced-Draft Cooling Tower',
    sector: 'Heat Exchangers & Boilers',
    category: 'Cooling Towers',
    tags: ['cooling tower', 'dual fan', 'crossflow', 'induced draft', 'chiller', 'evaporative', 'fluid cooler', 'louvers', 'handrails', 'ladder', 'piping', 'fans', 'hvac', '3d'],
    assetType: 'parametric',
    symbolId: 'thermal.dual_fan_cooling_tower',
    description: 'Heavy dual-fan industrial crossflow cooling tower with aerodynamic top fan stacks, protective dome grilles, perimeter safety handrails, access cage ladder, intake louver banks, and rooftop distribution piping.',
    defaultW: 3.8,
    defaultH: 3.2,
    defaultD: 3.2,
    animatableParts: ['fans', 'fan_1', 'fan_2', 'water_basin'],
    icon: 'fa-snowflake'
  },

  // =========================================================================
  // 7. MATERIAL HANDLING & CONVEYORS
  // =========================================================================
  {
    id: 'conveyors.belt_section',
    name: 'Modular Industrial Belt Conveyor Bed Section',
    sector: 'Material Handling',
    category: 'Belt Conveyors',
    tags: ['conveyor', 'belt', 'material handling', 'mining', 'logistics', '3d'],
    assetType: 'parametric',
    symbolId: 'conveyors.belt_section',
    description: 'Formed structural steel conveyor section with rubber belt surface, motorized drive pulley, and troughing idler sets.',
    defaultW: 4.0,
    defaultH: 1.2,
    defaultD: 1.2,
    animatableParts: ['drive_pulley', 'belt'],
    icon: 'fa-boxes-packing'
  },

  // =========================================================================
  // 8. POWER GENERATION & GENERATORS
  // =========================================================================
  {
    id: 'generators.diesel_genset',
    name: 'Industrial Diesel Engine Generator Set (DG)',
    sector: 'Power Generation',
    category: 'Diesel Generators',
    tags: ['generator', 'diesel', 'genset', 'dg', 'rotor', 'alternator', 'engine', 'power', '3d'],
    assetType: 'parametric',
    symbolId: 'generators.diesel_genset',
    description: 'Continuous rated industrial diesel generator skid with heavy engine block, high-output alternator rotor, radiator cooling fan, exhaust stack, and digital control panel.',
    defaultW: 4.2,
    defaultH: 2.4,
    defaultD: 1.8,
    animatableParts: ['rotor', 'cooling_fan', 'exhaust_stack', 'control_panel'],
    icon: 'fa-bolt-lightning'
  },
  {
    id: 'generators.gas_turbine',
    name: 'Industrial Gas Turbine Generator Unit (GG)',
    sector: 'Power Generation',
    category: 'Gas Turbines',
    tags: ['generator', 'gas turbine', 'gg', 'turbine rotor', 'compressor', 'power', '3d'],
    assetType: 'parametric',
    symbolId: 'generators.gas_turbine',
    description: 'Heavy duty aeroderivative gas turbine generator package with high-speed axial compressor, turbine rotor assembly, and alternator.',
    defaultW: 5.5,
    defaultH: 2.8,
    defaultD: 2.2,
    animatableParts: ['turbine_rotor', 'compressor_stages', 'cooling_fan'],
    icon: 'fa-gauge-high'
  },

  // =========================================================================
  // 9. PIPING & PIPE FITTINGS
  // =========================================================================
  {
    id: 'pipes.straight_flanged',
    name: 'Straight Flanged Pipe Spool (Schedule 40)',
    sector: 'Piping & Fittings',
    category: 'Straight Pipes',
    tags: ['pipe', 'piping', 'flanged', 'straight', 'spool', 'schedule 40', '3d'],
    assetType: 'parametric',
    symbolId: 'pipes.straight_flanged',
    description: 'Industrial straight pipe spool with dual ANSI raised-face flanged connections and bolt rings.',
    defaultW: 3.0,
    defaultH: 0.7,
    defaultD: 0.7,
    animatableParts: ['fluid_flow'],
    icon: 'fa-grip-lines'
  },
  {
    id: 'pipes.elbow_90',
    name: '90° Long-Radius Flanged Pipe Elbow Bend',
    sector: 'Piping & Fittings',
    category: 'Pipe Elbows & Bends',
    tags: ['pipe', 'elbow', 'bend', '90 degree', 'flanged', 'curve', '3d'],
    assetType: 'parametric',
    symbolId: 'pipes.elbow_90',
    description: '90-degree smooth long-radius curved pipe bend with flanged connection terminations.',
    defaultW: 1.6,
    defaultH: 1.6,
    defaultD: 0.7,
    animatableParts: ['fluid_flow'],
    icon: 'fa-turn-up'
  },
  {
    id: 'pipes.elbow_45',
    name: '45° Flanged Pipe Elbow Bend',
    sector: 'Piping & Fittings',
    category: 'Pipe Elbows & Bends',
    tags: ['pipe', 'elbow', 'bend', '45 degree', 'flanged', 'angle', '3d'],
    assetType: 'parametric',
    symbolId: 'pipes.elbow_45',
    description: '45-degree angled pipe elbow with bolted flanged ends for elevation and directional shifts.',
    defaultW: 1.5,
    defaultH: 1.2,
    defaultD: 0.7,
    animatableParts: ['fluid_flow'],
    icon: 'fa-arrow-trend-up'
  },
  {
    id: 'pipes.tee_joint',
    name: '3-Way Equal Flanged Pipe T-Joint Branch',
    sector: 'Piping & Fittings',
    category: 'T-Joints & Junctions',
    tags: ['pipe', 'tee', 'joint', 'branch', '3 way', 'flanged', 'junction', '3d'],
    assetType: 'parametric',
    symbolId: 'pipes.tee_joint',
    description: 'Equal 3-way tee junction pipe fitting with weld reinforcement collar and three flanged ports.',
    defaultW: 2.2,
    defaultH: 1.4,
    defaultD: 0.7,
    animatableParts: ['fluid_flow'],
    icon: 'fa-code-branch'
  },
  {
    id: 'pipes.cross_joint',
    name: '4-Way Flanged Pipe Cross Junction',
    sector: 'Piping & Fittings',
    category: 'T-Joints & Junctions',
    tags: ['pipe', 'cross', 'joint', '4 way', 'manifold', 'flanged', 'junction', '3d'],
    assetType: 'parametric',
    symbolId: 'pipes.cross_joint',
    description: '4-way cross manifold pipe fitting with four orthogonal flanged connection ports.',
    defaultW: 2.2,
    defaultH: 2.2,
    defaultD: 0.7,
    animatableParts: ['fluid_flow'],
    icon: 'fa-plus'
  },
  {
    id: 'pipes.reducer_conical',
    name: 'Concentric Conical Pipe Reducer Spool',
    sector: 'Piping & Fittings',
    category: 'Reducers & Transitions',
    tags: ['pipe', 'reducer', 'conical', 'transition', 'expander', 'flanged', '3d'],
    assetType: 'parametric',
    symbolId: 'pipes.reducer_conical',
    description: 'Concentric conical pipe reducer spool transitioning between large and small nominal pipe diameters.',
    defaultW: 1.8,
    defaultH: 0.8,
    defaultD: 0.8,
    animatableParts: ['fluid_flow'],
    icon: 'fa-filter'
  },
  {
    id: 'pipes.flange_joint',
    name: 'Bolted Weld-Neck Flange Pair Joint with Gasket',
    sector: 'Piping & Fittings',
    category: 'Flange Joints',
    tags: ['flange', 'joint', 'gasket', 'bolts', 'connection', '3d'],
    assetType: 'parametric',
    symbolId: 'pipes.flange_joint',
    description: 'High pressure dual weld-neck flange coupling clamped with 8 heavy hex bolts and resilient sealing gasket.',
    defaultW: 0.6,
    defaultH: 0.8,
    defaultD: 0.8,
    animatableParts: [],
    icon: 'fa-circle-notch'
  },

  // =========================================================================
  // 10. DUCTS & HVAC VENTILATION
  // =========================================================================
  {
    id: 'ducts.straight_rectangular',
    name: 'Straight Rectangular Galvanized Sheet Metal Duct',
    sector: 'Ducts & Ventilation',
    category: 'Rectangular Ducts',
    tags: ['duct', 'hvac', 'ventilation', 'rectangular', 'galvanized', 'sheet metal', 'air', '3d'],
    assetType: 'parametric',
    symbolId: 'ducts.straight_rectangular',
    description: 'Galvanized sheet metal rectangular air duct with reinforced transverse duct flange (TDF) joint frames.',
    defaultW: 3.0,
    defaultH: 1.0,
    defaultD: 1.4,
    animatableParts: ['air_flow'],
    icon: 'fa-vector-square'
  },
  {
    id: 'ducts.elbow_90_rectangular',
    name: '90° Curved Rectangular Duct Elbow with Turning Vanes',
    sector: 'Ducts & Ventilation',
    category: 'Duct Elbows & Bends',
    tags: ['duct', 'elbow', 'bend', '90 degree', 'rectangular', 'hvac', 'turning vanes', '3d'],
    assetType: 'parametric',
    symbolId: 'ducts.elbow_90_rectangular',
    description: 'Smooth radius 90-degree rectangular duct elbow fitted with internal aerodynamic turning guide vanes.',
    defaultW: 2.2,
    defaultH: 1.0,
    defaultD: 2.2,
    animatableParts: ['air_flow'],
    icon: 'fa-arrow-turn-down'
  },
  {
    id: 'ducts.transition_rect_to_round',
    name: 'Rectangular to Round Duct Transition Fitting',
    sector: 'Ducts & Ventilation',
    category: 'Duct Transitions',
    tags: ['duct', 'transition', 'rectangular', 'round', 'hvac', 'fitting', 'adapter', '3d'],
    assetType: 'parametric',
    symbolId: 'ducts.transition_rect_to_round',
    description: 'Smooth aerodynamic transition fitting adapting rectangular ducting to round spiral ventilation piping.',
    defaultW: 1.8,
    defaultH: 1.1,
    defaultD: 1.3,
    animatableParts: ['air_flow'],
    icon: 'fa-shuffle'
  },
  {
    id: 'ducts.spiral_round_straight',
    name: 'Spiral Round Galvanized Steel Air Duct',
    sector: 'Ducts & Ventilation',
    category: 'Spiral Round Ducts',
    tags: ['duct', 'round', 'spiral', 'hvac', 'ventilation', 'corrugated', '3d'],
    assetType: 'parametric',
    symbolId: 'ducts.spiral_round_straight',
    description: 'Heavy duty spiral lockseam round galvanized air duct with reinforcing helical ribs.',
    defaultW: 3.2,
    defaultH: 0.9,
    defaultD: 0.9,
    animatableParts: ['air_flow'],
    icon: 'fa-circle'
  },
  {
    id: 'ducts.elbow_90_round_spiral',
    name: '90° 5-Segment Mitered Round Duct Elbow',
    sector: 'Ducts & Ventilation',
    category: 'Duct Elbows & Bends',
    tags: ['duct', 'round', 'elbow', 'mitered', '90 degree', 'spiral', 'bend', '3d'],
    assetType: 'parametric',
    symbolId: 'ducts.elbow_90_round_spiral',
    description: 'Precision 5-segment die-stamped/mitered round duct elbow bend with collar slip-joints.',
    defaultW: 1.8,
    defaultH: 1.8,
    defaultD: 0.9,
    animatableParts: ['air_flow'],
    icon: 'fa-arrows-split-up-and-left'
  },
  {
    id: 'ducts.tee_branch_rectangular',
    name: 'Rectangular Duct 90° T-Takeoff Branch',
    sector: 'Ducts & Ventilation',
    category: 'Duct Takeoffs & Tees',
    tags: ['duct', 'tee', 'branch', 'takeoff', 'rectangular', 'hvac', 'junction', '3d'],
    assetType: 'parametric',
    symbolId: 'ducts.tee_branch_rectangular',
    description: 'Rectangular main ventilation trunk duct with a 90-degree branch takeoff fitting and connecting flanges.',
    defaultW: 2.6,
    defaultH: 1.0,
    defaultD: 2.0,
    animatableParts: ['air_flow'],
    icon: 'fa-arrows-turn-to-dots'
  }
];
