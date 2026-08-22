import * as THREE from 'three';
import { MaterialManager } from '../core/MaterialManager';

export class PrimitiveFactory {
  private materialManager: MaterialManager;

  constructor(materialManager: MaterialManager) {
    this.materialManager = materialManager;
  }

  // =========================================================================
  // 1. PUMPS & COMPRESSORS
  // =========================================================================

  /**
   * Creates a high-fidelity parametric 3D Centrifugal Process Pump & Motor Skid.
   */
  public createCentrifugalPump(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Centrifugal_Pump';
    group.userData = { isEquipmentRoot: true, assetId: 'pumps.centrifugal.end_suction' };

    const steelMat = this.materialManager.getMaterial('painted_steel_blue');
    const castIronMat = this.materialManager.getMaterial('cast_iron');
    const skidMat = this.materialManager.getMaterial('dark_slate_skid');
    const brassMat = this.materialManager.getMaterial('brass_bronze');
    const stainlessMat = this.materialManager.getMaterial('stainless_steel');
    const yellowMat = this.materialManager.getMaterial('safety_yellow');

    // 1. Heavy Base Skid Channel Frame
    const skidGeo = new THREE.BoxGeometry(2.4, 0.15, 1.0);
    const skidMesh = new THREE.Mesh(skidGeo, skidMat);
    skidMesh.position.set(0, 0.075, 0);
    skidMesh.castShadow = true;
    skidMesh.receiveShadow = true;
    group.add(skidMesh);

    // 2. Spiral Volute Pump Casing
    const voluteGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 32);
    const voluteMesh = new THREE.Mesh(voluteGeo, steelMat);
    voluteMesh.rotation.z = Math.PI / 2;
    voluteMesh.position.set(-0.5, 0.65, 0);
    voluteMesh.castShadow = true;
    group.add(voluteMesh);

    // 3. Suction Flange (Inlet along -X, open-ended to reveal spinning impeller vanes)
    const suctionGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.35, 24, 1, true);
    const suctionMesh = new THREE.Mesh(suctionGeo, steelMat);
    suctionMesh.rotation.z = Math.PI / 2;
    suctionMesh.position.set(-0.85, 0.65, 0);
    suctionMesh.castShadow = true;
    group.add(suctionMesh);

    const suctionFlangeGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 24, 1, true);
    const suctionFlangeMesh = new THREE.Mesh(suctionFlangeGeo, castIronMat);
    suctionFlangeMesh.rotation.z = Math.PI / 2;
    suctionFlangeMesh.position.set(-1.05, 0.65, 0);
    suctionFlangeMesh.castShadow = true;
    group.add(suctionFlangeMesh);

    // 4. Discharge Flange (Outlet vertically along +Y)
    const dischargeGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.45, 24);
    const dischargeMesh = new THREE.Mesh(dischargeGeo, steelMat);
    dischargeMesh.position.set(-0.5, 1.0, 0);
    dischargeMesh.castShadow = true;
    group.add(dischargeMesh);

    const dischargeFlangeGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 24);
    const dischargeFlangeMesh = new THREE.Mesh(dischargeFlangeGeo, castIronMat);
    dischargeFlangeMesh.position.set(-0.5, 1.25, 0);
    dischargeFlangeMesh.castShadow = true;
    group.add(dischargeFlangeMesh);

    // 5. Bearing Bracket & Shaft Housing
    const bracketGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.45, 24);
    const bracketMesh = new THREE.Mesh(bracketGeo, castIronMat);
    bracketMesh.rotation.z = Math.PI / 2;
    bracketMesh.position.set(-0.1, 0.65, 0);
    bracketMesh.castShadow = true;
    group.add(bracketMesh);

    // 6. Highly-Visible Rotating Flexible Shaft Coupling (Between pump and motor)
    const couplingGroup = new THREE.Group();
    couplingGroup.name = 'Shaft_Coupling';
    couplingGroup.userData = { subPartId: 'shaft', isRotatingSubpart: true, defaultAxis: 'x' };
    couplingGroup.position.set(0.25, 0.65, 0);

    const couplingHubL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16), castIronMat);
    couplingHubL.rotation.z = Math.PI / 2;
    couplingHubL.position.set(-0.06, 0, 0);
    couplingGroup.add(couplingHubL);

    const couplingHubR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16), stainlessMat);
    couplingHubR.rotation.z = Math.PI / 2;
    couplingHubR.position.set(0.06, 0, 0);
    couplingGroup.add(couplingHubR);

    // 4 High-Contrast Yellow/Black Drive Pins (Stroboscopic motion indicators)
    for (let b = 0; b < 4; b++) {
      const bAngle = (b * Math.PI) / 2;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 8), yellowMat);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(0, 0.12 * Math.sin(bAngle), 0.12 * Math.cos(bAngle));
      couplingGroup.add(bolt);
    }
    group.add(couplingGroup);

    // 7. Rotating Shaft & Multi-Vane Impeller Group (Targetable by SCADA Animation)
    const rotatingGroup = new THREE.Group();
    rotatingGroup.name = 'Impeller_Rotor';
    rotatingGroup.userData = { subPartId: 'impeller', isRotatingSubpart: true, defaultAxis: 'x' };
    rotatingGroup.position.set(-0.5, 0.65, 0);

    const shaftGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 16);
    const shaftMesh = new THREE.Mesh(shaftGeo, stainlessMat);
    shaftMesh.rotation.z = Math.PI / 2;
    shaftMesh.position.set(0.35, 0, 0);
    rotatingGroup.add(shaftMesh);

    // Impeller Hub Disc
    const impellerHubGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.14, 20);
    const impellerHub = new THREE.Mesh(impellerHubGeo, brassMat);
    impellerHub.rotation.z = Math.PI / 2;
    impellerHub.position.set(-0.35, 0, 0);
    rotatingGroup.add(impellerHub);

    // 6 Curved Aerodynamic Impeller Blades visible inside suction port
    for (let i = 0; i < 6; i++) {
      const vaneRoot = new THREE.Group();
      vaneRoot.rotation.x = (i * Math.PI) / 3;
      vaneRoot.position.set(-0.35, 0, 0);

      const vaneGeo = new THREE.BoxGeometry(0.08, 0.24, 0.04);
      const vane = new THREE.Mesh(vaneGeo, brassMat);
      vane.position.set(0, 0.14, 0);
      vane.rotation.z = 0.35; // curved backward sweep
      vaneRoot.add(vane);

      // Contrasting tip highlight for visible rotation
      const tipGeo = new THREE.BoxGeometry(0.085, 0.05, 0.045);
      const tip = new THREE.Mesh(tipGeo, i % 2 === 0 ? stainlessMat : yellowMat);
      tip.position.set(0, 0.24, 0);
      tip.rotation.z = 0.35;
      vaneRoot.add(tip);

      rotatingGroup.add(vaneRoot);
    }
    group.add(rotatingGroup);

    // 8. TEFC Drive Motor (Right side of skid with open cowl and visible 8-blade cooling fan)
    const motorGroup = this.createTEFCMotor();
    motorGroup.position.set(0.65, 0.15, 0);
    group.add(motorGroup);

    return group;
  }

  /**
   * Creates a Horizontal Multi-Stage High-Pressure Ring Section Pump.
   */
  public createMultiStagePump(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'MultiStage_Pump';
    group.userData = { isEquipmentRoot: true, assetId: 'pumps.multistage.horizontal' };

    const steelMat = this.materialManager.getMaterial('painted_steel_blue');
    const castIronMat = this.materialManager.getMaterial('cast_iron');
    const stainlessMat = this.materialManager.getMaterial('stainless_steel');
    const skidMat = this.materialManager.getMaterial('dark_slate_skid');
    const yellowMat = this.materialManager.getMaterial('safety_yellow');
    const brassMat = this.materialManager.getMaterial('brass_bronze');

    // Heavy Skid Base
    const skidGeo = new THREE.BoxGeometry(3.2, 0.15, 1.1);
    const skidMesh = new THREE.Mesh(skidGeo, skidMat);
    skidMesh.position.set(0, 0.075, 0);
    group.add(skidMesh);

    // Suction Casing (Left)
    const suctionCasing = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.35, 24, 1, true), steelMat);
    suctionCasing.rotation.z = Math.PI / 2;
    suctionCasing.position.set(-1.0, 0.65, 0);
    group.add(suctionCasing);

    // Suction Flange
    const suctionFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 24, 1, true), castIronMat);
    suctionFlange.rotation.z = Math.PI / 2;
    suctionFlange.position.set(-1.25, 0.65, 0);
    group.add(suctionFlange);

    // 4 Stage Ring Casings with Tie-Bolts
    for (let i = 0; i < 4; i++) {
      const stageMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.22, 24), steelMat);
      stageMesh.rotation.z = Math.PI / 2;
      stageMesh.position.set(-0.75 + i * 0.25, 0.65, 0);
      group.add(stageMesh);

      const stageRing = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 24), castIronMat);
      stageRing.rotation.z = Math.PI / 2;
      stageRing.position.set(-0.75 + i * 0.25, 0.65, 0);
      group.add(stageRing);
    }

    // 4 Heavy External Tie-Bolts clamping stages
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.25, 12), stainlessMat);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(-0.35, 0.65 + 0.42 * Math.sin(angle), 0.42 * Math.cos(angle));
      group.add(bolt);
    }

    // Discharge Casing & Top Vertical Outlet Flange
    const dischargeCasing = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.35, 24), steelMat);
    dischargeCasing.rotation.z = Math.PI / 2;
    dischargeCasing.position.set(0.3, 0.65, 0);
    group.add(dischargeCasing);

    const dischargeFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 24), steelMat);
    dischargeFlange.position.set(0.3, 1.0, 0);
    group.add(dischargeFlange);

    // Visible Rotating Multi-Stage Impeller Rotor in Suction
    const multiStageRotor = new THREE.Group();
    multiStageRotor.name = 'MultiStage_Rotor';
    multiStageRotor.userData = { subPartId: 'impeller', isRotatingSubpart: true, defaultAxis: 'x' };
    multiStageRotor.position.set(-1.05, 0.65, 0);

    const msHub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 16), brassMat);
    msHub.rotation.z = Math.PI / 2;
    multiStageRotor.add(msHub);

    for (let v = 0; v < 6; v++) {
      const vane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.04), v % 2 === 0 ? brassMat : yellowMat);
      vane.rotation.x = (v * Math.PI) / 3;
      vane.position.set(0, 0.12, 0);
      multiStageRotor.add(vane);
    }
    group.add(multiStageRotor);

    // Motor (with open cowl and 8 visible cooling fan blades)
    const motorGroup = this.createTEFCMotor();
    motorGroup.position.set(1.1, 0.15, 0);
    group.add(motorGroup);

    return group;
  }

  // =========================================================================
  // 2. MOTORS & MECHANICAL DRIVES
  // =========================================================================

  /**
   * Creates a high-fidelity parametric 3D TEFC AC Induction Motor.
   * Features an open ventilation cowl and highly visible multi-blade cooling fan with rotational indicators.
   */
  public createTEFCMotor(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'TEFC_Motor';
    group.userData = { isEquipmentRoot: true, assetId: 'motors.tefc_ac_motor' };

    const bodyMat = this.materialManager.getMaterial('painted_steel_blue');
    const castIronMat = this.materialManager.getMaterial('cast_iron');
    const yellowMat = this.materialManager.getMaterial('safety_yellow');
    const orangeMat = this.materialManager.getMaterial('hazard_orange');
    const stainlessMat = this.materialManager.getMaterial('stainless_steel');
    const darkMat = this.materialManager.getMaterial('dark_slate_skid');

    // 1. Ribbed Stator Housing (Cylinder)
    const statorGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 32);
    const statorMesh = new THREE.Mesh(statorGeo, bodyMat);
    statorMesh.rotation.z = Math.PI / 2;
    statorMesh.position.set(0, 0.5, 0);
    statorMesh.castShadow = true;
    group.add(statorMesh);

    // Cooling Fins (4 Rib Rings)
    for (let i = -0.25; i <= 0.25; i += 0.15) {
      const finGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.04, 32);
      const finMesh = new THREE.Mesh(finGeo, castIronMat);
      finMesh.rotation.z = Math.PI / 2;
      finMesh.position.set(i, 0.5, 0);
      group.add(finMesh);
    }

    // 2. Terminal Box (Top of motor)
    const boxGeo = new THREE.BoxGeometry(0.3, 0.2, 0.28);
    const boxMesh = new THREE.Mesh(boxGeo, castIronMat);
    boxMesh.position.set(0, 0.95, 0);
    boxMesh.castShadow = true;
    group.add(boxMesh);

    // 3. Mounting Feet (Base)
    const feetGeo = new THREE.BoxGeometry(0.7, 0.1, 0.7);
    const feetMesh = new THREE.Mesh(feetGeo, castIronMat);
    feetMesh.position.set(0, 0.05, 0);
    feetMesh.castShadow = true;
    group.add(feetMesh);

    // 4. Drive-End Shaft Output (-X direction)
    const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 16);
    const shaftMesh = new THREE.Mesh(shaftGeo, stainlessMat);
    shaftMesh.name = 'Motor_Shaft';
    shaftMesh.userData = { subPartId: 'shaft', isRotatingSubpart: true, defaultAxis: 'x' };
    shaftMesh.rotation.z = Math.PI / 2;
    shaftMesh.position.set(-0.55, 0.5, 0);
    group.add(shaftMesh);

    // 5. Non-Drive-End Fan Shroud / Cowl (+X direction) - Open-ended ventilation cowl
    const cowlGeo = new THREE.CylinderGeometry(0.39, 0.37, 0.28, 32, 1, true); // open-ended cylinder ring
    const cowlMesh = new THREE.Mesh(cowlGeo, darkMat);
    cowlMesh.rotation.z = Math.PI / 2;
    cowlMesh.position.set(0.52, 0.5, 0);
    cowlMesh.castShadow = true;
    group.add(cowlMesh);

    // Cowl Outer Protective Retention Ring & Safety Grille Rim
    const cowlRimGeo = new THREE.TorusGeometry(0.38, 0.02, 12, 32);
    const cowlRim = new THREE.Mesh(cowlRimGeo, darkMat);
    cowlRim.rotation.y = Math.PI / 2;
    cowlRim.position.set(0.66, 0.5, 0);
    group.add(cowlRim);

    // 4 Thin Wire Safety Cross Struts (Fixed to stator, does not rotate)
    for (let s = 0; s < 4; s++) {
      const strutGeo = new THREE.BoxGeometry(0.015, 0.74, 0.015);
      const strut = new THREE.Mesh(strutGeo, darkMat);
      strut.rotation.x = (s * Math.PI) / 4;
      strut.position.set(0.66, 0.5, 0);
      group.add(strut);
    }

    // 6. Highly-Visible Rotating Multi-Blade Cooling Fan (Targetable by SCADA Animation)
    const fanGroup = new THREE.Group();
    fanGroup.name = 'Motor_Fan';
    fanGroup.userData = { subPartId: 'cooling_fan', isRotatingSubpart: true, defaultAxis: 'x' };
    fanGroup.position.set(0.53, 0.5, 0);

    // Center Hub (Heavy Cast Iron)
    const fanHubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 20);
    const fanHub = new THREE.Mesh(fanHubGeo, castIronMat);
    fanHub.rotation.z = Math.PI / 2;
    fanGroup.add(fanHub);

    // Central Aerodynamic Spinner Nosecone with High-Contrast Strobe Notch
    const noseGeo = new THREE.ConeGeometry(0.12, 0.16, 20);
    const noseMesh = new THREE.Mesh(noseGeo, orangeMat);
    noseMesh.rotation.z = -Math.PI / 2;
    noseMesh.position.set(0.12, 0, 0);
    fanGroup.add(noseMesh);

    // Contrasting White/Stainless Strobe Marker for unmistakable rotational motion
    const strobeMarker = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), stainlessMat);
    strobeMarker.position.set(0.14, 0.05, 0);
    fanGroup.add(strobeMarker);

    // 8 Robust Aerodynamic Fan Blades with High-Visibility Pitch and Contrasting Tip Accents
    const numBlades = 8;
    for (let i = 0; i < numBlades; i++) {
      const bladeRoot = new THREE.Group();
      bladeRoot.rotation.x = (i * 2 * Math.PI) / numBlades;

      // Main Aerodynamic Curved Blade Body
      const bladeGeo = new THREE.BoxGeometry(0.06, 0.22, 0.08);
      const bladeMat = i % 2 === 0 ? yellowMat : orangeMat;
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(0, 0.23, 0);
      blade.rotation.y = 0.45; // 25 degree aerodynamic twist angle for dramatic lighting highlights
      bladeRoot.add(blade);

      // High-Contrast Tip Stripe for sharp visual strobe effect
      const tipGeo = new THREE.BoxGeometry(0.062, 0.05, 0.082);
      const tip = new THREE.Mesh(tipGeo, i % 2 === 0 ? darkMat : stainlessMat);
      tip.position.set(0, 0.32, 0);
      tip.rotation.y = 0.45;
      bladeRoot.add(tip);

      fanGroup.add(bladeRoot);
    }
    group.add(fanGroup);

    return group;
  }

  /**
   * Creates an Industrial Helical Gearbox / Speed Reducer Unit.
   */
  public createGearboxReducer(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Gearbox_Reducer';
    group.userData = { isEquipmentRoot: true, assetId: 'drives.gearbox_reducer' };

    const castIronMat = this.materialManager.getMaterial('cast_iron');
    const steelMat = this.materialManager.getMaterial('carbon_steel');
    const stainlessMat = this.materialManager.getMaterial('stainless_steel');

    // Gearbox Main Cast Housing
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.9, 0.8);
    const bodyMesh = new THREE.Mesh(bodyGeo, castIronMat);
    bodyMesh.position.set(0, 0.55, 0);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Inspection Top Cover
    const coverGeo = new THREE.BoxGeometry(0.8, 0.1, 0.5);
    const coverMesh = new THREE.Mesh(coverGeo, steelMat);
    coverMesh.position.set(0, 1.05, 0);
    group.add(coverMesh);

    // Breather Vent Plug
    const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12), stainlessMat);
    vent.position.set(0, 1.15, 0);
    group.add(vent);

    // High Speed Input Shaft (-X)
    const inputShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 16), stainlessMat);
    inputShaft.name = 'Input_Shaft';
    inputShaft.userData = { subPartId: 'input_shaft' };
    inputShaft.rotation.z = Math.PI / 2;
    inputShaft.position.set(-0.7, 0.7, 0);
    group.add(inputShaft);

    // Low Speed High Torque Output Shaft (+X)
    const outputShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 16), stainlessMat);
    outputShaft.name = 'Output_Shaft';
    outputShaft.userData = { subPartId: 'output_shaft' };
    outputShaft.rotation.z = Math.PI / 2;
    outputShaft.position.set(0.7, 0.4, 0);
    group.add(outputShaft);

    // Mounting Foot Plate
    const footGeo = new THREE.BoxGeometry(1.4, 0.1, 0.9);
    const footMesh = new THREE.Mesh(footGeo, castIronMat);
    footMesh.position.set(0, 0.05, 0);
    group.add(footMesh);

    return group;
  }

  // =========================================================================
  // 3. TANKS & PROCESS VESSELS
  // =========================================================================

  /**
   * Creates a high-fidelity parametric 3D Storage Tank with dynamic fluid level.
   */
  public createStorageTank(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Storage_Tank';
    group.userData = { isEquipmentRoot: true, assetId: 'tanks.vertical_storage' };

    const steelMat = this.materialManager.getMaterial('stainless_steel');
    const castIronMat = this.materialManager.getMaterial('carbon_steel');
    const fluidMat = this.materialManager.getMaterial('fluid_water_blue');

    const radius = 1.2;
    const height = 3.2;

    // 1. Tank Body Shell (Cylinder)
    const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 36, 1, true);
    const bodyMesh = new THREE.Mesh(bodyGeo, steelMat);
    bodyMesh.position.set(0, height / 2 + 0.4, 0);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // 2. Dished Top Dome Head
    const domeGeo = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMesh = new THREE.Mesh(domeGeo, steelMat);
    domeMesh.position.set(0, height + 0.4, 0);
    domeMesh.castShadow = true;
    group.add(domeMesh);

    // 3. Tank Legs (4 Tubular Support Columns)
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 16);
      const legMesh = new THREE.Mesh(legGeo, castIronMat);
      const lx = (radius - 0.1) * Math.cos(angle);
      const lz = (radius - 0.1) * Math.sin(angle);
      legMesh.position.set(lx, 0.4, lz);
      legMesh.castShadow = true;
      group.add(legMesh);
    }

    // 4. Manhole / Inspection Nozzle on Top
    const manholeGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 20);
    const manholeMesh = new THREE.Mesh(manholeGeo, castIronMat);
    manholeMesh.position.set(0, height + radius * 0.9, 0);
    group.add(manholeMesh);

    // 5. Dynamic Fluid Column (Targetable for 0-100% Level Animation)
    const fluidGeo = new THREE.CylinderGeometry(radius - 0.02, radius - 0.02, height, 32);
    const fluidMesh = new THREE.Mesh(fluidGeo, fluidMat);
    fluidMesh.name = 'Fluid_Level';
    fluidMesh.userData = { subPartId: 'liquid', initialHeight: height };
    fluidMesh.position.set(0, height / 2 + 0.4, 0);
    fluidMesh.scale.set(1, 0.5, 1);
    group.add(fluidMesh);

    return group;
  }

  /**
   * Creates a Horizontal Pressurized Storage Bullet Vessel.
   */
  public createHorizontalBulletVessel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Horizontal_Bullet_Vessel';
    group.userData = { isEquipmentRoot: true, assetId: 'tanks.horizontal_bullet' };

    const steelMat = this.materialManager.getMaterial('stainless_steel');
    const saddleMat = this.materialManager.getMaterial('carbon_steel');
    const fluidMat = this.materialManager.getMaterial('fluid_water_blue');

    const radius = 0.9;
    const length = 3.0;

    // Main Cylindrical Shell
    const bodyGeo = new THREE.CylinderGeometry(radius, radius, length, 32);
    const bodyMesh = new THREE.Mesh(bodyGeo, steelMat);
    bodyMesh.rotation.z = Math.PI / 2;
    bodyMesh.position.set(0, 1.2, 0);
    group.add(bodyMesh);

    // Hemispherical Heads (Left & Right)
    const headLeft = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), steelMat);
    headLeft.rotation.z = -Math.PI / 2;
    headLeft.position.set(-length / 2, 1.2, 0);
    group.add(headLeft);

    const headRight = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), steelMat);
    headRight.rotation.z = Math.PI / 2;
    headRight.position.set(length / 2, 1.2, 0);
    group.add(headRight);

    // 2 Concrete / Steel Saddle Supports
    for (const sx of [-1.0, 1.0]) {
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 1.8), saddleMat);
      saddle.position.set(sx, 0.3, 0);
      group.add(saddle);
    }

    // Top Relief Nozzles
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16), steelMat);
    nozzle.position.set(0, 1.2 + radius + 0.15, 0);
    group.add(nozzle);

    // Dynamic Liquid Level
    const fluidMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius - 0.03, radius - 0.03, length - 0.1, 24), fluidMat);
    fluidMesh.name = 'Fluid_Level';
    fluidMesh.userData = { subPartId: 'liquid' };
    fluidMesh.rotation.z = Math.PI / 2;
    fluidMesh.position.set(0, 1.2, 0);
    fluidMesh.scale.set(1, 0.6, 1);
    group.add(fluidMesh);

    return group;
  }

  /**
   * Creates an Industrial Bulk Storage Silo & Conical Hopper.
   */
  public createConicalSilo(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Conical_Silo';
    group.userData = { isEquipmentRoot: true, assetId: 'tanks.conical_silo' };

    const steelMat = this.materialManager.getMaterial('galvanized_zinc');
    const legMat = this.materialManager.getMaterial('carbon_steel');
    const safetyYellow = this.materialManager.getMaterial('safety_yellow');

    const radius = 1.3;
    const bodyHeight = 2.8;
    const coneHeight = 1.2;

    // Top Cylindrical Shell
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, bodyHeight, 32), steelMat);
    shell.position.set(0, 1.5 + coneHeight + bodyHeight / 2, 0);
    group.add(shell);

    // Top Roof Cone
    const roof = new THREE.Mesh(new THREE.ConeGeometry(radius + 0.1, 0.6, 32), steelMat);
    roof.position.set(0, 1.5 + coneHeight + bodyHeight + 0.3, 0);
    group.add(roof);

    // Bottom Conical Hopper Discharge
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(radius, 0.25, coneHeight, 32), steelMat);
    cone.position.set(0, 1.5 + coneHeight / 2, 0);
    group.add(cone);

    // Bottom Rotary Valve / Chute
    const chute = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 20), legMat);
    chute.position.set(0, 1.3, 0);
    group.add(chute);

    // 4 Heavy H-Beam Support Columns
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.5, 0.16), legMat);
      const lx = (radius + 0.1) * Math.cos(angle);
      const lz = (radius + 0.1) * Math.sin(angle);
      leg.position.set(lx, 1.25, lz);
      group.add(leg);

      // Yellow footpads
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.35), safetyYellow);
      pad.position.set(lx, 0.04, lz);
      group.add(pad);
    }

    return group;
  }

  /**
   * Creates a Chemical Agitator & Reactor Vessel with top gearmotor drive.
   */
  public createAgitatorReactor(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Agitator_Reactor';
    group.userData = { isEquipmentRoot: true, assetId: 'tanks.agitator_reactor' };

    const steelMat = this.materialManager.getMaterial('stainless_steel');
    const motorMat = this.materialManager.getMaterial('painted_steel_blue');
    const castIronMat = this.materialManager.getMaterial('cast_iron');
    const fluidMat = this.materialManager.getMaterial('fluid_oil_amber');
    const stainlessMat = this.materialManager.getMaterial('stainless_steel');

    const radius = 1.2;
    const bodyHeight = 2.4;

    // Jacketed Vessel Body
    const vessel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, bodyHeight, 32), steelMat);
    vessel.position.set(0, bodyHeight / 2 + 0.5, 0);
    group.add(vessel);

    // Dished Top Head
    const topHead = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), steelMat);
    topHead.position.set(0, bodyHeight + 0.5, 0);
    group.add(topHead);

    // Top Agitator Drive Gearmotor
    const gearhead = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.5, 20), castIronMat);
    gearhead.position.set(0, bodyHeight + radius + 0.65, 0);
    group.add(gearhead);

    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 20), motorMat);
    motor.position.set(0, bodyHeight + radius + 1.2, 0);
    group.add(motor);

    // Rotating Agitator Shaft & Multi-Tier Turbine Impellers
    const agitatorRotor = new THREE.Group();
    agitatorRotor.name = 'Agitator_Rotor';
    agitatorRotor.userData = { subPartId: 'agitator_shaft' };
    agitatorRotor.position.set(0, bodyHeight / 2 + 0.5, 0);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, bodyHeight + 0.8, 16), stainlessMat);
    agitatorRotor.add(shaft);

    // 2 Tiers of 4-Blade Rushton Turbines
    for (const ty of [-0.6, 0.3]) {
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.03), stainlessMat);
        blade.rotation.y = (i * Math.PI) / 2;
        blade.position.set(0, ty, 0);
        agitatorRotor.add(blade);
      }
    }
    group.add(agitatorRotor);

    // 4 Support Legs
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 16), castIronMat);
      leg.position.set((radius - 0.1) * Math.cos(angle), 0.4, (radius - 0.1) * Math.sin(angle));
      group.add(leg);
    }

    // Dynamic Liquid inside
    const fluidMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius - 0.02, radius - 0.02, bodyHeight - 0.2, 24), fluidMat);
    fluidMesh.name = 'Fluid_Level';
    fluidMesh.userData = { subPartId: 'liquid' };
    fluidMesh.position.set(0, bodyHeight / 2 + 0.5, 0);
    fluidMesh.scale.set(1, 0.7, 1);
    group.add(fluidMesh);

    return group;
  }

  // =========================================================================
  // 4. VALVES & ACTUATORS
  // =========================================================================

  /**
   * Creates an Industrial Wafer Butterfly Valve with hollow pipe bore and internal rotating disc.
   */
  public createButterflyValve(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Butterfly_Valve';
    group.userData = { isEquipmentRoot: true, assetId: 'valves.butterfly_wafer' };

    const bodyMat = this.materialManager.getMaterial('cast_iron');
    const discMat = this.materialManager.getMaterial('stainless_steel');
    const actuatorMat = this.materialManager.getMaterial('hazard_orange');
    const stainlessMat = this.materialManager.getMaterial('stainless_steel');
    const yellowMat = this.materialManager.getMaterial('safety_yellow');
    const darkMat = this.materialManager.getMaterial('dark_slate_skid');

    // 1. Hollow Wafer Body (Annular Ring with Through-Hole Bore along X-axis)
    const outerRadius = 0.50;
    const innerRadius = 0.38;
    const waferDepth = 0.22;

    const bodyShape = new THREE.Shape();
    bodyShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const boreHole = new THREE.Path();
    boreHole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    bodyShape.holes.push(boreHole);

    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: waferDepth,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015,
      curveSegments: 32
    });
    bodyGeo.center();

    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.rotation.y = Math.PI / 2; // Pipe bore runs through X-axis
    bodyMesh.position.set(0, 0.55, 0);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // 4 Outer Wafer Alignment Bolt Lugs / Ears
    for (let i = 0; i < 4; i++) {
      const lAngle = (i * Math.PI) / 2 + Math.PI / 4;
      const lug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, waferDepth + 0.02, 16), bodyMat);
      lug.rotation.z = Math.PI / 2;
      lug.position.set(0, 0.55 + 0.54 * Math.sin(lAngle), 0.54 * Math.cos(lAngle));
      group.add(lug);

      // Bolt through-hole marker
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, waferDepth + 0.03, 12), darkMat);
      hole.rotation.z = Math.PI / 2;
      hole.position.set(0, 0.55 + 0.54 * Math.sin(lAngle), 0.54 * Math.cos(lAngle));
      group.add(hole);
    }

    // 2. Fixed Vertical Stem / Shaft Sleeve
    const stemGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.95, 16);
    const stemMesh = new THREE.Mesh(stemGeo, stainlessMat);
    stemMesh.position.set(0, 0.55, 0);
    group.add(stemMesh);

    // 3. Top Actuator Spindle Neck & Mounting Flange
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.35, 20);
    const neckMesh = new THREE.Mesh(neckGeo, bodyMat);
    neckMesh.position.set(0, 0.98, 0);
    group.add(neckMesh);

    const neckFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20), bodyMat);
    neckFlange.position.set(0, 1.15, 0);
    group.add(neckFlange);

    // 4. Pneumatic Double-Acting Cylinder Actuator
    const actuatorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.65, 24);
    const actuatorMesh = new THREE.Mesh(actuatorGeo, actuatorMat);
    actuatorMesh.position.set(0, 1.5, 0);
    actuatorMesh.castShadow = true;
    group.add(actuatorMesh);

    // Top Visual Position Beacon / Rotary Dome
    const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16), darkMat);
    beaconBase.position.set(0, 1.87, 0);
    group.add(beaconBase);

    const beaconDome = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), yellowMat);
    beaconDome.position.set(0, 1.92, 0);
    group.add(beaconDome);

    // 5. ROTATING BUTTERFLY DISC (Pivot-centered at local origin 0, 0.55, 0)
    // Rotates around Y-axis: 0° = Closed (perpendicular to bore), 90° = Fully Open (parallel to flow)
    const discGroup = new THREE.Group();
    discGroup.name = 'Valve_Disc';
    discGroup.userData = { subPartId: 'valve_disc', isRotatingSubpart: true, defaultAxis: 'y' };
    discGroup.position.set(0, 0.55, 0);

    // Center Shaft Collar Hub
    const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.72, 16);
    const hubMesh = new THREE.Mesh(hubGeo, stainlessMat);
    discGroup.add(hubMesh);

    // Main Round Butterfly Disc (Fits neatly inside inner bore radius 0.38)
    const discBladeGeo = new THREE.CylinderGeometry(0.365, 0.365, 0.035, 32);
    const discBlade = new THREE.Mesh(discBladeGeo, discMat);
    discBlade.rotation.z = Math.PI / 2; // Normal along X-axis when rotation Y = 0 (seals bore)
    discGroup.add(discBlade);

    // Contrasting Resilient Sealing Edge Ring (Yellow/Nitrile)
    const sealRingGeo = new THREE.TorusGeometry(0.363, 0.012, 8, 32);
    const sealRing = new THREE.Mesh(sealRingGeo, yellowMat);
    sealRing.rotation.y = Math.PI / 2;
    discGroup.add(sealRing);

    group.add(discGroup);

    return group;
  }

  /**
   * Creates a Globe Control Valve with Pneumatic Spring-Diaphragm Actuator & Positioner.
   */
  public createGlobeControlValve(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Globe_Control_Valve';
    group.userData = { isEquipmentRoot: true, assetId: 'valves.globe_control' };

    const bodyMat = this.materialManager.getMaterial('cast_iron');
    const steelMat = this.materialManager.getMaterial('carbon_steel');
    const domeMat = this.materialManager.getMaterial('safety_green');
    const positionerMat = this.materialManager.getMaterial('painted_steel_blue');
    const stainlessMat = this.materialManager.getMaterial('stainless_steel');

    // Spherical Globe Valve Center Body
    const sphereBody = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16), bodyMat);
    sphereBody.position.set(0, 0.4, 0);
    group.add(sphereBody);

    // Left & Right Flanges
    for (const fx of [-0.45, 0.45]) {
      const port = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 20), bodyMat);
      port.rotation.z = Math.PI / 2;
      port.position.set(fx * 0.6, 0.4, 0);
      group.add(port);

      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 20), steelMat);
      flange.rotation.z = Math.PI / 2;
      flange.position.set(fx, 0.4, 0);
      group.add(flange);
    }

    // Valve Bonnet & Stem Yoke
    const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.5, 16), bodyMat);
    yoke.position.set(0, 0.85, 0);
    group.add(yoke);

    // Diaphragm Actuator Dome Housing
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 32), domeMat);
    dome.position.set(0, 1.45, 0);
    group.add(dome);

    const domeTop = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    domeTop.position.set(0, 1.62, 0);
    group.add(domeTop);

    // Side Smart Positioner Enclosure
    const posBox = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.2), positionerMat);
    posBox.position.set(0.22, 1.0, 0);
    group.add(posBox);

    // Linear Moving Stem Indicator
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12), stainlessMat);
    stem.name = 'Valve_Stem';
    stem.userData = { subPartId: 'valve_stem' };
    stem.position.set(0, 0.85, 0);
    group.add(stem);

    return group;
  }

  /**
   * Creates a Motorized Ball Valve with Electric Rotary Actuator.
   */
  public createMotorizedBallValve(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Motorized_Ball_Valve';
    group.userData = { isEquipmentRoot: true, assetId: 'valves.motorized_ball' };

    const bodyMat = this.materialManager.getMaterial('stainless_steel');
    const actuatorMat = this.materialManager.getMaterial('painted_steel_blue');
    const castIronMat = this.materialManager.getMaterial('cast_iron');
    const yellowMat = this.materialManager.getMaterial('safety_yellow');

    // Central Ball Valve Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 24), bodyMat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.35, 0);
    group.add(body);

    // Flanges
    for (const fx of [-0.35, 0.35]) {
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 20), castIronMat);
      flange.rotation.z = Math.PI / 2;
      flange.position.set(fx, 0.35, 0);
      group.add(flange);
    }

    // Mounting Bracket
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), castIronMat);
    bracket.position.set(0, 0.7, 0);
    group.add(bracket);

    // Electric Rotary Actuator Housing
    const actBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.4), actuatorMat);
    actBody.position.set(0, 1.05, 0);
    group.add(actBody);

    // Actuator Position Dome Indicator (Rotatable)
    const indGroup = new THREE.Group();
    indGroup.name = 'Valve_Indicator';
    indGroup.userData = { subPartId: 'indicator' };
    indGroup.position.set(0, 1.32, 0);

    const indDome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), yellowMat);
    indGroup.add(indDome);
    group.add(indGroup);

    return group;
  }

  // =========================================================================
  // 5. FANS & VENTILATION
  // =========================================================================

  /**
   * Creates an Industrial Tubular Vane Axial Duct Fan.
   */
  public createAxialFan(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Axial_Duct_Fan';
    group.userData = { isEquipmentRoot: true, assetId: 'fans.vane_axial.heavy_duty' };

    const bodyMat = this.materialManager.getMaterial('galvanized_zinc');
    const bladeMat = this.materialManager.getMaterial('safety_yellow');
    const hubMat = this.materialManager.getMaterial('cast_iron');

    // 1. Outer Tubular Duct Casing
    const ductGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.2, 32, 1, true);
    const ductMesh = new THREE.Mesh(ductGeo, bodyMat);
    ductMesh.rotation.z = Math.PI / 2;
    ductMesh.position.set(0, 0.8, 0);
    ductMesh.castShadow = true;
    group.add(ductMesh);

    // Flanges on both ends
    const flangeL = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.06, 32), bodyMat);
    flangeL.rotation.z = Math.PI / 2;
    flangeL.position.set(-0.6, 0.8, 0);
    group.add(flangeL);

    const flangeR = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.06, 32), bodyMat);
    flangeR.rotation.z = Math.PI / 2;
    flangeR.position.set(0.6, 0.8, 0);
    group.add(flangeR);

    // 2. Rotating Impeller Blades Group (Targetable for SCADA Spin Animation)
    const rotorGroup = new THREE.Group();
    rotorGroup.name = 'Fan_Blades';
    rotorGroup.userData = { subPartId: 'impeller' };
    rotorGroup.position.set(0, 0.8, 0);

    const hubGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 20);
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    hubMesh.rotation.z = Math.PI / 2;
    rotorGroup.add(hubMesh);

    // 6 Aerofoil Blades
    for (let i = 0; i < 6; i++) {
      const bladeGeo = new THREE.BoxGeometry(0.04, 0.5, 0.12);
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.rotation.x = (i * Math.PI) / 3;
      rotorGroup.add(blade);
    }
    group.add(rotorGroup);

    return group;
  }

  /**
   * Creates an Industrial Box Wall Exhaust Fan (Marenco Style Agriculture & HVAC Wall Fan)
   * With Square Shroud Housing, 6-Blade Aerodynamic Rotor, Corner Belt Drive Motor,
   * Automatic Shutter Louvers, Center Bearing Struts, and Wire Safety Mesh Guards.
   */
  public createBoxWallExhaustFan(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Industrial_Box_Wall_Exhaust_Fan';
    group.userData = { isEquipmentRoot: true, assetId: 'fans.box_wall_exhaust' };

    const frameMat = this.materialManager.getMaterial('cast_iron'); // Dark charcoal/slate
    const venturiMat = this.materialManager.getMaterial('carbon_steel');
    const bladeMat = this.materialManager.getMaterial('cast_iron'); // Dark metallic airfoil
    const motorMat = this.materialManager.getMaterial('painted_steel_blue'); // Cyan/Machine Blue
    const pulleyMat = this.materialManager.getMaterial('carbon_steel');
    const beltMat = this.materialManager.getMaterial('cast_iron');
    const louverMat = this.materialManager.getMaterial('stainless_steel'); // Galvanized/Alum
    const wireMat = this.materialManager.getMaterial('carbon_steel');
    const stainlessMat = this.materialManager.getMaterial('stainless_steel');

    const width = 2.0;
    const height = 2.0;
    const depth = 0.42;
    const centerY = 1.0;

    // 1. OUTER SQUARE BOX FRAME CASING
    const frameGroup = new THREE.Group();
    frameGroup.name = 'Housing_Frame';

    // Top Beam
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, depth), frameMat);
    topBeam.position.set(0, centerY + height / 2 - 0.04, 0);
    topBeam.castShadow = true;
    frameGroup.add(topBeam);

    // Bottom Beam
    const bottomBeam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, depth), frameMat);
    bottomBeam.position.set(0, centerY - height / 2 + 0.04, 0);
    bottomBeam.castShadow = true;
    frameGroup.add(bottomBeam);

    // Left Post
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, height - 0.16, depth), frameMat);
    leftPost.position.set(-width / 2 + 0.04, centerY, 0);
    leftPost.castShadow = true;
    frameGroup.add(leftPost);

    // Right Post
    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, height - 0.16, depth), frameMat);
    rightPost.position.set(width / 2 - 0.04, centerY, 0);
    rightPost.castShadow = true;
    frameGroup.add(rightPost);

    // Outer Mounting Flange Perimeter Lips
    const flangeTop = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.04, 0.05), frameMat);
    flangeTop.position.set(0, centerY + height / 2 + 0.02, depth / 2 - 0.025);
    frameGroup.add(flangeTop);

    const flangeBottom = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.04, 0.05), frameMat);
    flangeBottom.position.set(0, centerY - height / 2 - 0.02, depth / 2 - 0.025);
    frameGroup.add(flangeBottom);

    const flangeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, height + 0.12, 0.05), frameMat);
    flangeLeft.position.set(-width / 2 - 0.02, centerY, depth / 2 - 0.025);
    frameGroup.add(flangeLeft);

    const flangeRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, height + 0.12, 0.05), frameMat);
    flangeRight.position.set(width / 2 + 0.02, centerY, depth / 2 - 0.025);
    frameGroup.add(flangeRight);

    // 4 Corner Stiffener Gussets
    const cornerOffsets = [
      { x: -0.78, y: centerY + 0.78 },
      { x: 0.78, y: centerY + 0.78 },
      { x: -0.78, y: centerY - 0.78 },
      { x: 0.78, y: centerY - 0.78 }
    ];
    for (let c = 0; c < cornerOffsets.length; c++) {
      const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.03), frameMat);
      gusset.position.set(cornerOffsets[c].x, cornerOffsets[c].y, 0.05);
      frameGroup.add(gusset);
    }

    group.add(frameGroup);

    // 2. CIRCULAR AERODYNAMIC VENTURI INFLOW SHROUD
    const venturiRadius = 0.92;
    const venturiGeo = new THREE.CylinderGeometry(venturiRadius, venturiRadius, depth * 0.75, 48, 1, true);
    const venturiMesh = new THREE.Mesh(venturiGeo, venturiMat);
    venturiMesh.rotation.x = Math.PI / 2;
    venturiMesh.position.set(0, centerY, 0);
    venturiMesh.castShadow = true;
    group.add(venturiMesh);

    // Bellmouth Inflow Rim
    const bellmouthGeo = new THREE.TorusGeometry(venturiRadius, 0.025, 12, 48);
    const bellmouthMesh = new THREE.Mesh(bellmouthGeo, frameMat);
    bellmouthMesh.position.set(0, centerY, depth * 0.35);
    group.add(bellmouthMesh);

    // 3. ROTATING 6-BLADE IMPELLER ROTOR (Targetable for SCADA Continuous Spin & Speed)
    const rotorGroup = new THREE.Group();
    rotorGroup.name = 'Fan_Rotor';
    rotorGroup.userData = { subPartId: 'impeller', isRotatingSubpart: true, defaultAxis: 'z' };
    rotorGroup.position.set(0, centerY, 0.02);

    // Central Spider Hub Plate
    const hubCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 24), stainlessMat);
    hubCenter.rotation.x = Math.PI / 2;
    hubCenter.castShadow = true;
    rotorGroup.add(hubCenter);

    // Nose Spinner Cone
    const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.12, 24), stainlessMat);
    noseCone.rotation.x = Math.PI / 2;
    noseCone.position.set(0, 0, 0.08);
    rotorGroup.add(noseCone);

    // 6 Wide Aerodynamic Heavy-Duty Airfoil Blades
    const numBlades = 6;
    for (let i = 0; i < numBlades; i++) {
      const bladeAngle = (i * Math.PI * 2) / numBlades;
      const bladeArm = new THREE.Group();
      bladeArm.rotation.z = bladeAngle;

      // Cast Spider Mounting Arm
      const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.03), stainlessMat);
      armMesh.position.set(0, 0.16, 0);
      armMesh.castShadow = true;
      bladeArm.add(armMesh);

      // Wide Contoured Airfoil Blade (Pitched for aerodynamic airflow)
      const bladeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.64, 0.016), bladeMat);
      bladeMesh.position.set(0, 0.54, 0);
      bladeMesh.rotation.x = THREE.MathUtils.degToRad(22); // Aerodynamic pitch angle
      bladeMesh.rotation.y = THREE.MathUtils.degToRad(-5); // Dihedral twist
      bladeMesh.castShadow = true;
      bladeArm.add(bladeMesh);

      // Blade Tip Stiffener Lip
      const tipMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.02), bladeMat);
      tipMesh.position.set(0, 0.86, 0.02);
      bladeArm.add(tipMesh);

      rotorGroup.add(bladeArm);
    }
    group.add(rotorGroup);

    // 4. UPPER CORNER DRIVE MOTOR & V-BELT PULLEY SYSTEM
    const motorMountX = 0.64;
    const motorMountY = centerY + 0.64;
    const motorZ = 0.04;

    // Corner Motor Mounting Base Plate
    const motorBase = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.03), frameMat);
    motorBase.position.set(motorMountX, motorMountY, motorZ);
    group.add(motorBase);

    // TEFC Electric Drive Motor in Machine Blue / Cyan
    const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 24), motorMat);
    motorBody.name = 'Drive_Motor';
    motorBody.userData = { subPartId: 'motor' };
    motorBody.rotation.x = Math.PI / 2;
    motorBody.position.set(motorMountX, motorMountY, motorZ + 0.06);
    motorBody.castShadow = true;
    group.add(motorBody);

    // Motor Cooling Ribs
    for (let r = -0.08; r <= 0.08; r += 0.04) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.123, 0.008, 8, 24), motorMat);
      rib.position.set(motorMountX, motorMountY, motorZ + 0.06 + r);
      group.add(rib);
    }

    // Motor Terminal Box
    const termBox = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), motorMat);
    termBox.position.set(motorMountX - 0.09, motorMountY + 0.09, motorZ + 0.06);
    group.add(termBox);

    // Motor Drive Pulley (Small grooved sheave)
    const motorPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 20), pulleyMat);
    motorPulley.name = 'Motor_Pulley';
    motorPulley.rotation.x = Math.PI / 2;
    motorPulley.position.set(motorMountX, motorMountY, motorZ + 0.17);
    group.add(motorPulley);

    // Center Large Fan Pulley (Cast iron 4-spoke wheel)
    const fanPulleyGroup = new THREE.Group();
    fanPulleyGroup.name = 'Fan_Pulley';
    fanPulleyGroup.position.set(0, centerY, motorZ + 0.17);

    const fanPulleyRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 12, 32), pulleyMat);
    fanPulleyGroup.add(fanPulleyRim);

    const fanPulleyHub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.035, 20), pulleyMat);
    fanPulleyHub.rotation.x = Math.PI / 2;
    fanPulleyGroup.add(fanPulleyHub);

    // 4 Spokes
    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.22, 0.015), pulleyMat);
      spoke.rotation.z = (s * Math.PI) / 4;
      spoke.position.set(0, 0, 0);
      fanPulleyGroup.add(spoke);
    }
    group.add(fanPulleyGroup);

    // Heavy-Duty Stretched Industrial V-Belt (Between Motor Pulley & Center Fan Pulley)
    const beltVector = new THREE.Vector2(motorMountX, motorMountY - centerY);
    const beltLen = beltVector.length();
    const beltAngle = Math.atan2(beltVector.y, beltVector.x);

    const beltTopSpan = new THREE.Mesh(new THREE.BoxGeometry(beltLen, 0.015, 0.015), beltMat);
    beltTopSpan.rotation.z = beltAngle;
    beltTopSpan.position.set(motorMountX / 2, centerY + (motorMountY - centerY) / 2 + 0.04, motorZ + 0.17);
    group.add(beltTopSpan);

    const beltBotSpan = new THREE.Mesh(new THREE.BoxGeometry(beltLen, 0.015, 0.015), beltMat);
    beltBotSpan.rotation.z = beltAngle;
    beltBotSpan.position.set(motorMountX / 2, centerY + (motorMountY - centerY) / 2 - 0.04, motorZ + 0.17);
    group.add(beltBotSpan);

    // 5. VERTICAL STRUCTURAL SUPPORT STRUTS & BEARING HOUSING
    const verticalStrut = new THREE.Mesh(new THREE.BoxGeometry(0.06, height - 0.16, 0.04), frameMat);
    verticalStrut.position.set(0, centerY, 0.15);
    verticalStrut.castShadow = true;
    group.add(verticalStrut);

    // Center Pillow Block Bearing Housing
    const bearingHousing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.07), frameMat);
    bearingHousing.position.set(0, centerY, 0.14);
    group.add(bearingHousing);

    // Central Stainless Shaft Extension
    const centerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 16), stainlessMat);
    centerShaft.rotation.x = Math.PI / 2;
    centerShaft.position.set(0, centerY, 0.11);
    group.add(centerShaft);

    // 6. AUTOMATIC GRAVITY SHUTTER LOUVERS (Rear / Discharge Face)
    const louverGroup = new THREE.Group();
    louverGroup.name = 'Louver_Shutters';
    louverGroup.userData = { subPartId: 'louvers_assembly' };
    louverGroup.position.set(0, 0, 0);

    const louverCount = 8;
    const louverSpacing = (height - 0.3) / louverCount;
    for (let l = 0; l < louverCount; l++) {
      const louverY = 0.25 + l * louverSpacing;
      const slatGroup = new THREE.Group();
      slatGroup.name = `Louver_Slat_${l}`;
      slatGroup.userData = { subPartId: 'louvers', defaultAxis: 'x' };
      slatGroup.position.set(0, louverY, -depth / 2 + 0.04);

      // Aluminum Aerodynamic Blade Slat (Hangs below top hinge pin)
      const slatMesh = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.19, 0.012), louverMat);
      slatMesh.position.set(0, -0.085, 0);
      slatMesh.castShadow = true;
      slatGroup.add(slatMesh);

      // Slat Top Pivot Pins
      const pinL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12), frameMat);
      pinL.rotation.z = Math.PI / 2;
      pinL.position.set(-width / 2 + 0.08, 0, 0);
      slatGroup.add(pinL);

      const pinR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12), frameMat);
      pinR.rotation.z = Math.PI / 2;
      pinR.position.set(width / 2 - 0.08, 0, 0);
      slatGroup.add(pinR);

      louverGroup.add(slatGroup);
    }

    // Vertical Slat Linkage Tie Bar
    const linkageBar = new THREE.Mesh(new THREE.BoxGeometry(0.016, height - 0.35, 0.016), stainlessMat);
    linkageBar.position.set(0.82, centerY, -depth / 2 + 0.06);
    louverGroup.add(linkageBar);

    group.add(louverGroup);

    // 7. PROTECTIVE WELDED WIRE SAFETY MESH SCREEN (Front Face)
    const frontMeshGroup = new THREE.Group();
    frontMeshGroup.name = 'Wire_Safety_Guard_Front';

    const numWireRods = 10;
    const wireSpacing = (width - 0.2) / numWireRods;

    // Vertical Wires
    for (let v = 0; v <= numWireRods; v++) {
      const vx = -width / 2 + 0.1 + v * wireSpacing;
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, height - 0.16, 8), wireMat);
      wire.position.set(vx, centerY, depth / 2 - 0.02);
      frontMeshGroup.add(wire);
    }

    // Horizontal Wires
    for (let h = 0; h <= numWireRods; h++) {
      const hy = centerY - height / 2 + 0.1 + h * wireSpacing;
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, width - 0.16, 8), wireMat);
      wire.rotation.z = Math.PI / 2;
      wire.position.set(0, hy, depth / 2 - 0.02);
      frontMeshGroup.add(wire);
    }

    group.add(frontMeshGroup);

    return group;
  }

  /**
   * Creates an Industrial Centrifugal Scroll Blower.
   */
  public createCentrifugalBlower(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Centrifugal_Blower';
    group.userData = { isEquipmentRoot: true, assetId: 'fans.centrifugal_blower' };

    const bodyMat = this.materialManager.getMaterial('painted_steel_blue');
    const skidMat = this.materialManager.getMaterial('dark_slate_skid');
    const bladeMat = this.materialManager.getMaterial('safety_yellow');

    // Skid Frame
    const skid = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 1.2), skidMat);
    skid.position.set(0, 0.06, 0);
    group.add(skid);

    // Scroll Housing
    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.45, 32), bodyMat);
    scroll.position.set(-0.4, 0.9, 0);
    group.add(scroll);

    // Rectangular Discharge Duct (+Y)
    const duct = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.45), bodyMat);
    duct.position.set(-0.7, 1.3, 0);
    group.add(duct);

    // Circular Inlet Bellmouth (-Z)
    const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 24), bodyMat);
    inlet.rotation.x = Math.PI / 2;
    inlet.position.set(-0.4, 0.9, 0.3);
    group.add(inlet);

    // Impeller Wheel (Targetable)
    const rotor = new THREE.Group();
    rotor.name = 'Blower_Impeller';
    rotor.userData = { subPartId: 'impeller' };
    rotor.position.set(-0.4, 0.9, 0);

    for (let i = 0; i < 8; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.35), bladeMat);
      blade.rotation.z = (i * Math.PI) / 4;
      rotor.add(blade);
    }
    group.add(rotor);

    // Motor on right
    const motor = this.createTEFCMotor();
    motor.position.set(0.5, 0.12, 0);
    group.add(motor);

    return group;
  }

  // =========================================================================
  // 6. HEAT EXCHANGERS & THERMAL
  // =========================================================================

  /**
   * Creates an Industrial Shell & Tube Heat Exchanger.
   */
  public createShellAndTubeHeatExchanger(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Shell_Tube_Heat_Exchanger';
    group.userData = { isEquipmentRoot: true, assetId: 'thermal.shell_tube_exchanger' };

    const shellMat = this.materialManager.getMaterial('stainless_steel');
    const headMat = this.materialManager.getMaterial('painted_steel_blue');
    const saddleMat = this.materialManager.getMaterial('carbon_steel');
    const castIronMat = this.materialManager.getMaterial('cast_iron');

    const radius = 0.6;
    const length = 2.8;

    // Main Cylindrical Shell
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), shellMat);
    shell.rotation.z = Math.PI / 2;
    shell.position.set(0, 0.9, 0);
    group.add(shell);

    // Channel End Heads (Bonnet Caps)
    for (const hx of [-length / 2 - 0.25, length / 2 + 0.25]) {
      const bonnet = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.05, radius + 0.05, 0.45, 24), headMat);
      bonnet.rotation.z = Math.PI / 2;
      bonnet.position.set(hx, 0.9, 0);
      group.add(bonnet);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(radius + 0.05, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), headMat);
      dome.rotation.z = hx < 0 ? -Math.PI / 2 : Math.PI / 2;
      dome.position.set(hx < 0 ? hx - 0.22 : hx + 0.22, 0.9, 0);
      group.add(dome);
    }

    // Shell Side Nozzles (+Y top, -Y bottom)
    const topNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.35, 16), castIronMat);
    topNozzle.position.set(-0.8, 0.9 + radius + 0.15, 0);
    group.add(topNozzle);

    const btmNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.35, 16), castIronMat);
    btmNozzle.position.set(0.8, 0.9 - radius - 0.15, 0);
    group.add(btmNozzle);

    // 2 Saddle Supports
    for (const sx of [-0.8, 0.8]) {
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 1.4), saddleMat);
      saddle.position.set(sx, 0.25, 0);
      group.add(saddle);
    }

    return group;
  }

  /**
   * Creates a Gasketed Plate & Frame Heat Exchanger.
   */
  public createPlateHeatExchanger(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Plate_Heat_Exchanger';
    group.userData = { isEquipmentRoot: true, assetId: 'thermal.plate_heat_exchanger' };

    const frameMat = this.materialManager.getMaterial('painted_steel_blue');
    const plateMat = this.materialManager.getMaterial('stainless_steel');
    const rodMat = this.materialManager.getMaterial('carbon_steel');

    // Fixed Front Frame Plate (Head)
    const fixedFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 1.0), frameMat);
    fixedFrame.position.set(-0.6, 1.0, 0);
    group.add(fixedFrame);

    // Movable Rear Frame Plate (Follower)
    const movableFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 1.0), frameMat);
    movableFrame.position.set(0.6, 1.0, 0);
    group.add(movableFrame);

    // Corrugated Stainless Plate Pack
    const platePack = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.7, 0.88), plateMat);
    platePack.position.set(0, 1.0, 0);
    group.add(platePack);

    // Top Carrying Bar & Bottom Guide Bar
    for (const by of [0.08, 1.92]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 12), rodMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, by, 0);
      group.add(bar);
    }

    // 4 Front Flanged Connection Ports
    for (const [py, pz] of [[0.4, -0.3], [0.4, 0.3], [1.6, -0.3], [1.6, 0.3]]) {
      const port = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16), plateMat);
      port.rotation.z = Math.PI / 2;
      port.position.set(-0.72, py, pz);
      group.add(port);
    }

    return group;
  }

  /**
   * Creates an Industrial Induced Draft Cooling Tower Cell.
   */
  public createCoolingTower(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Cooling_Tower_Cell';
    group.userData = { isEquipmentRoot: true, assetId: 'thermal.cooling_tower_cell' };

    const bodyMat = this.materialManager.getMaterial('galvanized_zinc');
    const basinMat = this.materialManager.getMaterial('dark_slate_skid');
    const fanMat = this.materialManager.getMaterial('safety_yellow');
    const hubMat = this.materialManager.getMaterial('cast_iron');

    // Cold Water Basin (Base)
    const basin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.4, 2.8), basinMat);
    basin.position.set(0, 0.2, 0);
    group.add(basin);

    // Casing Tower Box
    const towerBox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 2.6), bodyMat);
    towerBox.position.set(0, 1.4, 0);
    group.add(towerBox);

    // Air Intake Louvers (Cutout styling stripes)
    for (let i = -0.6; i <= 0.6; i += 0.3) {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.08, 2.64), basinMat);
      louver.position.set(0, 0.8 + i, 0);
      group.add(louver);
    }

    // Aerodynamic Top Fan Cylinder Stack
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.8, 32, 1, true), bodyMat);
    stack.position.set(0, 2.8, 0);
    group.add(stack);

    // Top Fan Blades (Targetable by SCADA Animation)
    const fanGroup = new THREE.Group();
    fanGroup.name = 'CoolingTower_Fan';
    fanGroup.userData = { subPartId: 'fan_blades' };
    fanGroup.position.set(0, 2.8, 0);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 16), hubMat);
    fanGroup.add(hub);

    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.16), fanMat);
      blade.rotation.y = (i * Math.PI) / 2;
      blade.position.set(0.4 * Math.cos((i * Math.PI) / 2), 0, 0.4 * Math.sin((i * Math.PI) / 2));
      fanGroup.add(blade);
    }
    group.add(fanGroup);

    return group;
  }

  /**
   * Creates an Industrial Dual-Fan Crossflow Induced-Draft Cooling Tower / Chiller.
   * Features:
   * - Off-white fiberglass FRP casing with stepped base basin
   * - 4-bay louver intake banks on front & rear with angled metallic slats
   * - Side panels with structural reinforcement pilasters
   * - Rooftop with perimeter safety guardrails (top rail, mid rail, posts) and ladder gate gap
   * - Corner industrial access ladder with rungs extending to roof deck
   * - Dual top-mounted induced-draft axial fans (Fan_Rotor_1 & Fan_Rotor_2) with 8 pitched blades each
   * - Stainless protective dome grilles (concentric rings + radial wire spokes) over both fans
   * - Rooftop distribution piping and external side downspout recirculation piping
   */
  public createDualFanCoolingTower(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Dual_Fan_Cooling_Tower';
    group.userData = { isEquipmentRoot: true, assetId: 'thermal.dual_fan_cooling_tower' };

    const width = 3.6;   // X-axis (wide side with 4-bay louver banks)
    const depth = 3.0;   // Z-axis
    const height = 2.4;  // Y-axis to roof deck

    // Materials
    const casingMat = new THREE.MeshStandardMaterial({ color: 0xeae7dc, roughness: 0.45, metalness: 0.15 });
    const basinMat = new THREE.MeshStandardMaterial({ color: 0xdedad0, roughness: 0.6, metalness: 0.2 });
    const louverMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.5 });
    const framingMat = new THREE.MeshStandardMaterial({ color: 0xd6d2c4, roughness: 0.5, metalness: 0.2 });
    const steelRailingMat = new THREE.MeshStandardMaterial({ color: 0x262e38, roughness: 0.6, metalness: 0.7 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xa0aec0, roughness: 0.35, metalness: 0.75 });
    const fanBladeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.3 });
    const fanHubMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
    const guardWireMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.8 });

    // 1. LOWER COLD WATER BASIN & FOUNDATION PLINTH
    const basinBase = new THREE.Mesh(new THREE.BoxGeometry(width + 0.24, 0.18, depth + 0.24), basinMat);
    basinBase.position.set(0, 0.09, 0);
    basinBase.castShadow = true;
    basinBase.receiveShadow = true;
    group.add(basinBase);

    // Basin Outer Rim Flange
    const basinRim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.14, 0.08, depth + 0.14), basinMat);
    basinRim.position.set(0, 0.22, 0);
    group.add(basinRim);

    // 2. MAIN CASING BODY
    const casingBody = new THREE.Mesh(new THREE.BoxGeometry(width, height - 0.26, depth), casingMat);
    casingBody.position.set(0, 0.26 + (height - 0.26) / 2, 0);
    casingBody.castShadow = true;
    casingBody.receiveShadow = true;
    group.add(casingBody);

    // 3. FRONT & REAR AIR INTAKE LOUVER BANKS (4 bays per face)
    const bayCount = 4;
    const bayWidth = (width - 0.3) / bayCount;
    const louverHeight = height - 0.6;
    const slatCount = 18;
    const slatSpacing = louverHeight / slatCount;

    for (const zSide of [depth / 2 + 0.015, -depth / 2 - 0.015]) {
      // Outer Perimeter Frame around Louver Wall
      const wallFrameTop = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.12, 0.05), framingMat);
      wallFrameTop.position.set(0, height - 0.06, zSide);
      group.add(wallFrameTop);

      const wallFrameBtm = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.12, 0.05), framingMat);
      wallFrameBtm.position.set(0, 0.32, zSide);
      group.add(wallFrameBtm);

      for (let b = 0; b < bayCount; b++) {
        const bayCenterX = -width / 2 + 0.15 + bayWidth / 2 + b * bayWidth;

        // Vertical Divider Mullion Columns
        const mullionL = new THREE.Mesh(new THREE.BoxGeometry(0.06, louverHeight + 0.1, 0.06), framingMat);
        mullionL.position.set(bayCenterX - bayWidth / 2, 0.38 + louverHeight / 2, zSide);
        group.add(mullionL);

        if (b === bayCount - 1) {
          const mullionR = new THREE.Mesh(new THREE.BoxGeometry(0.06, louverHeight + 0.1, 0.06), framingMat);
          mullionR.position.set(bayCenterX + bayWidth / 2, 0.38 + louverHeight / 2, zSide);
          group.add(mullionR);
        }

        // Louver Slats inside this bay (pitched at 20 degrees)
        for (let s = 0; s < slatCount; s++) {
          const slatY = 0.38 + s * slatSpacing;
          const slat = new THREE.Mesh(new THREE.BoxGeometry(bayWidth - 0.04, 0.045, 0.01), louverMat);
          slat.rotation.x = THREE.MathUtils.degToRad(zSide > 0 ? 25 : -25);
          slat.position.set(bayCenterX, slatY, zSide);
          group.add(slat);
        }
      }
    }

    // 4. LEFT & RIGHT END FACES (Solid Casing with Vertical Structural Battens / Pilasters)
    for (const xSide of [-width / 2 - 0.015, width / 2 + 0.015]) {
      // 4 Vertical Reinforcement Pilasters per side
      for (let p = 0; p < 5; p++) {
        const ribZ = -depth / 2 + 0.3 + p * ((depth - 0.6) / 4);
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.04, height - 0.4, 0.08), framingMat);
        rib.position.set(xSide, 0.26 + (height - 0.26) / 2, ribZ);
        group.add(rib);
      }
    }

    // 5. ROOFTOP DECK & PERIMETER SAFETY GUARDRAILS
    const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.1, depth + 0.12), casingMat);
    roofDeck.position.set(0, height + 0.05, 0);
    group.add(roofDeck);

    // Perimeter Handrail System (Height = 0.8m above roof)
    const railYTop = height + 0.85;
    const railYMid = height + 0.45;
    const railH = 0.8;

    // Corner & Intermediate Stanchion Posts
    const postCoords: [number, number][] = [];
    const xSteps = [-width / 2 + 0.04, -width / 4, 0, width / 4, width / 2 - 0.04];
    const zSteps = [-depth / 2 + 0.04, 0, depth / 2 - 0.04];

    for (const px of xSteps) {
      for (const pz of zSteps) {
        if (Math.abs(px) === width / 2 - 0.04 || Math.abs(pz) === depth / 2 - 0.04) {
          // Leave ladder gap at front-left corner (+Z, -X)
          if (px < -width / 2 + 0.4 && pz > depth / 2 - 0.5) continue;
          postCoords.push([px, pz]);
        }
      }
    }

    postCoords.forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, railH, 0.04), steelRailingMat);
      post.position.set(px, height + 0.1 + railH / 2, pz);
      group.add(post);
    });

    // Horizontal Rails (Top & Mid)
    // Rear Edge (-Z)
    for (const rY of [railYTop, railYMid]) {
      const railRear = new THREE.Mesh(new THREE.BoxGeometry(width, 0.035, 0.035), steelRailingMat);
      railRear.position.set(0, rY, -depth / 2 + 0.04);
      group.add(railRear);

      // Right Edge (+X)
      const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, depth), steelRailingMat);
      railRight.position.set(width / 2 - 0.04, rY, 0);
      group.add(railRight);

      // Left Edge (-X, stops before ladder opening)
      const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, depth - 0.6), steelRailingMat);
      railLeft.position.set(-width / 2 + 0.04, rY, -0.3);
      group.add(railLeft);

      // Front Edge (+Z, stops before ladder opening)
      const railFront = new THREE.Mesh(new THREE.BoxGeometry(width - 0.6, 0.035, 0.035), steelRailingMat);
      railFront.position.set(0.3, rY, depth / 2 - 0.04);
      group.add(railFront);
    }

    // 6. INDUSTRIAL ACCESS CAGE LADDER (Front-Left Corner: +Z, -X)
    const ladderX = -width / 2 - 0.06;
    const ladderZ = depth / 2 - 0.28;

    for (const lz of [ladderZ - 0.2, ladderZ + 0.2]) {
      const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.035, height + 0.75, 0.035), steelRailingMat);
      stringer.position.set(ladderX, (height + 0.85) / 2, lz);
      group.add(stringer);
    }

    // 9 Horizontal Rungs
    for (let r = 0; r < 9; r++) {
      const rungY = 0.25 + r * (height / 9);
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 12), steelRailingMat);
      rung.rotation.x = Math.PI / 2;
      rung.position.set(ladderX, rungY, ladderZ);
      group.add(rung);
    }

    // 7. DUAL INDUCED-DRAFT AXIAL FANS WITH PROTECTIVE WIRE DOMES
    const fanRadius = 0.65;
    const fanStackHeight = 0.16;

    // Placed diagonally across roof as in reference photos
    const fanPositions = [
      { id: 'fan_1', name: 'Fan_Rotor_1', x: -0.75, z: 0.50 },
      { id: 'fan_2', name: 'Fan_Rotor_2', x: 0.75, z: -0.50 }
    ];

    fanPositions.forEach(fp => {
      // Fan Stack Collar Cowl (Off-white / Galvanized)
      const stackCowl = new THREE.Mesh(
        new THREE.CylinderGeometry(fanRadius + 0.04, fanRadius + 0.06, fanStackHeight, 32, 1, true),
        framingMat
      );
      stackCowl.position.set(fp.x, height + 0.1 + fanStackHeight / 2, fp.z);
      group.add(stackCowl);

      const stackRim = new THREE.Mesh(
        new THREE.TorusGeometry(fanRadius + 0.04, 0.02, 12, 32),
        framingMat
      );
      stackRim.rotation.x = Math.PI / 2;
      stackRim.position.set(fp.x, height + 0.1 + fanStackHeight, fp.z);
      group.add(stackRim);

      // Rotating Impeller Rotor (Subpart targetable for SCADA Continuous Spin / Speed)
      const rotor = new THREE.Group();
      rotor.name = fp.name;
      rotor.userData = {
        subPartId: 'fans',
        fanIndex: fp.id,
        isRotatingSubpart: true,
        isRotatingFan: true,
        defaultAxis: 'y'
      };
      rotor.position.set(fp.x, height + 0.1 + fanStackHeight / 2 + 0.02, fp.z);

      // Central Nose Spinner Cone & Hub
      const spinner = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.1, 24), fanHubMat);
      rotor.add(spinner);

      const spinnerTip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), fanHubMat);
      spinnerTip.position.set(0, 0.05, 0);
      rotor.add(spinnerTip);

      // 8 Aerodynamic Pitch Fan Blades
      const bladeCount = 8;
      for (let b = 0; b < bladeCount; b++) {
        const bladeAngle = (b * Math.PI * 2) / bladeCount;
        const bladeGroup = new THREE.Group();
        bladeGroup.rotation.y = bladeAngle;

        // Aerodynamic airfoil blade with pitch angle
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, fanRadius - 0.15), fanBladeMat);
        blade.rotation.x = THREE.MathUtils.degToRad(22); // Aerodynamic pitch
        blade.position.set(0, 0, (fanRadius - 0.15) / 2 + 0.1);
        blade.castShadow = true;
        bladeGroup.add(blade);

        rotor.add(bladeGroup);
      }
      group.add(rotor);

      // Protective Steel Wire Mesh Dome Grille
      const domeCenterY = height + 0.1 + fanStackHeight;

      // 3 Concentric Wire Rings
      for (const rRing of [0.25, 0.45, fanRadius + 0.02]) {
        const ringRise = (1 - rRing / fanRadius) * 0.1;
        const wireRing = new THREE.Mesh(new THREE.TorusGeometry(rRing, 0.008, 8, 32), guardWireMat);
        wireRing.rotation.x = Math.PI / 2;
        wireRing.position.set(fp.x, domeCenterY + ringRise, fp.z);
        group.add(wireRing);
      }

      // 12 Radial Wire Spokes
      for (let s = 0; s < 12; s++) {
        const spokeAngle = (s * Math.PI * 2) / 12;
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, fanRadius + 0.02, 8), guardWireMat);
        spoke.rotation.z = Math.PI / 2;
        spoke.rotation.y = spokeAngle;
        spoke.position.set(
          fp.x + (Math.cos(spokeAngle) * (fanRadius + 0.02)) / 2,
          domeCenterY + 0.04,
          fp.z + (Math.sin(spokeAngle) * (fanRadius + 0.02)) / 2
        );
        group.add(spoke);
      }
    });

    // 8. ROOFTOP DISTRIBUTION PIPING & EXTERNAL RECIRCULATION PIPING
    const pipeRadius = 0.065;

    // Top Distribution Pipe Line 1 (Front / Right)
    const topPipe1 = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, 2.2, 16), pipeMat);
    topPipe1.rotation.x = Math.PI / 2;
    topPipe1.position.set(1.4, height + 0.35, 0.2);
    group.add(topPipe1);

    // Elbow dipping down into roof
    const elbow1 = new THREE.Mesh(new THREE.TorusGeometry(0.18, pipeRadius, 12, 16, Math.PI / 2), pipeMat);
    elbow1.rotation.y = -Math.PI / 2;
    elbow1.position.set(1.4, height + 0.17, 1.3);
    group.add(elbow1);

    const downStub1 = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, 0.2, 16), pipeMat);
    downStub1.position.set(1.4, height + 0.08, 1.48);
    group.add(downStub1);

    // Top Distribution Pipe Line 2 (Rear / Left)
    const topPipe2 = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, 2.2, 16), pipeMat);
    topPipe2.rotation.x = Math.PI / 2;
    topPipe2.position.set(-1.4, height + 0.35, -0.2);
    group.add(topPipe2);

    const elbow2 = new THREE.Mesh(new THREE.TorusGeometry(0.18, pipeRadius, 12, 16, Math.PI / 2), pipeMat);
    elbow2.rotation.y = Math.PI / 2;
    elbow2.position.set(-1.4, height + 0.17, -1.3);
    group.add(elbow2);

    const downStub2 = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, 0.2, 16), pipeMat);
    downStub2.position.set(-1.4, height + 0.08, -1.48);
    group.add(downStub2);

    // External Side Downspout Recirculation Pipe (on Right Face +X)
    const sideRiser = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, height - 0.7, 16), pipeMat);
    sideRiser.position.set(width / 2 + 0.14, height / 2 + 0.15, -depth / 2 + 0.6);
    group.add(sideRiser);

    const sideElbowTop = new THREE.Mesh(new THREE.TorusGeometry(0.18, pipeRadius, 12, 16, Math.PI / 2), pipeMat);
    sideElbowTop.rotation.y = 0;
    sideElbowTop.rotation.z = Math.PI / 2;
    sideElbowTop.position.set(width / 2 + 0.14 - 0.18, height - 0.2, -depth / 2 + 0.6);
    group.add(sideElbowTop);

    // Side Bottom Return Pipe to Basin
    const btmReturnPipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius * 1.2, pipeRadius * 1.2, 1.4, 16), pipeMat);
    btmReturnPipe.rotation.x = Math.PI / 2;
    btmReturnPipe.position.set(width / 2 + 0.14, 0.45, -depth / 2 + 1.3);
    group.add(btmReturnPipe);

    return group;
  }

  // =========================================================================
  // 7. MATERIAL HANDLING & CONVEYORS
  // =========================================================================

  /**
   * Creates a Modular Industrial Belt Conveyor Bed Section.
   */
  public createBeltConveyorSection(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Belt_Conveyor_Section';
    group.userData = { isEquipmentRoot: true, assetId: 'conveyors.belt_section' };

    const frameMat = this.materialManager.getMaterial('painted_steel_blue');
    const beltMat = this.materialManager.getMaterial('dark_slate_skid');
    const pulleyMat = this.materialManager.getMaterial('safety_yellow');
    const rollerMat = this.materialManager.getMaterial('carbon_steel');

    const length = 3.8;
    const width = 1.0;

    // Side Channel Frames
    for (const fz of [-width / 2, width / 2]) {
      const channel = new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, 0.08), frameMat);
      channel.position.set(0, 0.7, fz);
      group.add(channel);
    }

    // Support Legs (4 A-frame legs)
    for (const lx of [-length / 2 + 0.3, length / 2 - 0.3]) {
      for (const lz of [-width / 2, width / 2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 12), frameMat);
        leg.position.set(lx, 0.35, lz);
        group.add(leg);
      }
    }

    // Head Drive Pulley (Right)
    const headPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, width, 24), pulleyMat);
    headPulley.name = 'Drive_Pulley';
    headPulley.userData = { subPartId: 'drive_pulley' };
    headPulley.rotation.x = Math.PI / 2;
    headPulley.position.set(length / 2 - 0.2, 0.7, 0);
    group.add(headPulley);

    // Tail Idler Pulley (Left)
    const tailPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, width, 24), rollerMat);
    tailPulley.rotation.x = Math.PI / 2;
    tailPulley.position.set(-length / 2 + 0.2, 0.7, 0);
    group.add(tailPulley);

    // Troughing Idler Sets along length
    for (let x = -length / 2 + 0.8; x <= length / 2 - 0.8; x += 0.8) {
      const idler = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, width - 0.1, 16), rollerMat);
      idler.rotation.x = Math.PI / 2;
      idler.position.set(x, 0.78, 0);
      group.add(idler);
    }

    // Top & Bottom Belt Loops
    const topBelt = new THREE.Mesh(new THREE.BoxGeometry(length - 0.4, 0.04, width - 0.1), beltMat);
    topBelt.position.set(0, 0.88, 0);
    group.add(topBelt);

    const btmBelt = new THREE.Mesh(new THREE.BoxGeometry(length - 0.4, 0.04, width - 0.1), beltMat);
    btmBelt.position.set(0, 0.52, 0);
    group.add(btmBelt);

    return group;
  }

  // =========================================================================
  // FACTORY DISPATCHER
  // =========================================================================

  /**
   * Factory dispatcher by asset ID.
   */
  public createPrimitive(assetId: string): THREE.Group {
    const id = assetId.toLowerCase();

    // Piping & Pipe Fittings
    if (id.includes('pipes.straight') || id === 'pipe_straight' || (id.includes('pipe') && id.includes('straight'))) return this.createStraightPipe();
    if (id.includes('pipes.elbow_90') || (id.includes('pipe') && (id.includes('90') || id.includes('bend')))) return this.create90PipeElbow();
    if (id.includes('pipes.elbow_45') || (id.includes('pipe') && id.includes('45'))) return this.create45PipeElbow();
    if (id.includes('pipes.tee') || (id.includes('pipe') && id.includes('tee'))) return this.createPipeTee();
    if (id.includes('pipes.cross') || (id.includes('pipe') && id.includes('cross'))) return this.createPipeCross();
    if (id.includes('pipes.reducer') || (id.includes('pipe') && id.includes('reducer'))) return this.createPipeReducer();
    if (id.includes('pipes.flange') || (id.includes('flange') && id.includes('joint'))) return this.createFlangePairJoint();

    // Ducts & HVAC Ventilation
    if (id.includes('ducts.straight_rectangular') || (id.includes('duct') && id.includes('rectangular') && id.includes('straight'))) return this.createRectangularDuct();
    if (id.includes('ducts.elbow_90_rectangular') || (id.includes('duct') && id.includes('rectangular') && (id.includes('90') || id.includes('elbow')))) return this.create90RectangularDuctElbow();
    if (id.includes('ducts.transition') || (id.includes('duct') && id.includes('transition'))) return this.createDuctTransition();
    if (id.includes('ducts.spiral_round_straight') || (id.includes('duct') && id.includes('spiral') && id.includes('straight'))) return this.createSpiralRoundDuct();
    if (id.includes('ducts.elbow_90_round_spiral') || (id.includes('duct') && (id.includes('spiral') || id.includes('round')) && id.includes('elbow'))) return this.create90RoundDuctElbow();
    if (id.includes('ducts.tee_branch') || (id.includes('duct') && (id.includes('tee') || id.includes('branch')))) return this.createRectangularDuctTee();
    if (id.includes('duct')) return this.createRectangularDuct();
    if (id.includes('pipe')) return this.createStraightPipe();

    // Pumps
    if (id.includes('multistage')) return this.createMultiStagePump();
    if (id.includes('pump')) return this.createCentrifugalPump();

    // Motors & Drives
    if (id.includes('gearbox') || id.includes('reducer')) return this.createGearboxReducer();
    if (id.includes('motor')) return this.createTEFCMotor();

    // Tanks & Vessels
    if (id.includes('bullet') || id.includes('horizontal_bullet')) return this.createHorizontalBulletVessel();
    if (id.includes('silo') || id.includes('hopper')) return this.createConicalSilo();
    if (id.includes('agitator') || id.includes('reactor') || id.includes('mixer')) return this.createAgitatorReactor();
    if (id.includes('tank') || id.includes('vessel')) return this.createStorageTank();

    // Valves
    if (id.includes('globe') || id.includes('diaphragm')) return this.createGlobeControlValve();
    if (id.includes('ball') || id.includes('motorized_ball')) return this.createMotorizedBallValve();
    if (id.includes('valve')) return this.createButterflyValve();

    // Thermal & Heat Exchangers
    if (id.includes('dual_fan_cooling_tower') || id.includes('dual_fan') || id.includes('cooling_tower_dual')) return this.createDualFanCoolingTower();
    if (id.includes('plate')) return this.createPlateHeatExchanger();
    if (id.includes('cooling_tower') || id.includes('tower')) return this.createCoolingTower();
    if (id.includes('heat_exchanger') || id.includes('shell_tube') || id.includes('exchanger')) return this.createShellAndTubeHeatExchanger();

    // Fans & Blowers
    if (id.includes('fans.box_wall_exhaust') || id.includes('box_wall') || id.includes('wall_exhaust') || id.includes('marenco')) return this.createBoxWallExhaustFan();
    if (id.includes('blower') || id.includes('scroll')) return this.createCentrifugalBlower();
    if (id.includes('fan')) return this.createAxialFan();

    // Conveyors
    if (id.includes('conveyor') || id.includes('belt')) return this.createBeltConveyorSection();

    // Power Generation & Generators
    if (id.includes('diesel') || id.includes('genset') || id.includes('dg')) return this.createDieselGeneratorSet();
    if (id.includes('gas_turbine') || id.includes('turbine') || id.includes('gg')) return this.createGasTurbineGenerator();

    // Default fallback
    return this.createCentrifugalPump();
  }

  // =========================================================================
  // 8. POWER GENERATION & GENERATORS
  // =========================================================================

  /**
   * Industrial Diesel Engine Generator Set (DG)
   * With pivot-centered Rotor, Cooling Fan, and Exhaust Stack.
   */
  public createDieselGeneratorSet(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Diesel_Generator_Set';
    group.userData = { isEquipmentRoot: true, assetId: 'generators.diesel_genset' };

    const steelMat = this.materialManager.getMaterial('painted_steel_blue');
    const castIronMat = this.materialManager.getMaterial('cast_iron');
    const skidMat = this.materialManager.getMaterial('dark_slate_skid');
    const copperMat = this.materialManager.getMaterial('brass_bronze');
    const yellowMat = this.materialManager.getMaterial('hazard_yellow');
    const stainlessMat = this.materialManager.getMaterial('stainless_steel');

    // 1. Heavy Structural Skid Base
    const skidGeo = new THREE.BoxGeometry(4.2, 0.25, 1.8);
    const skidMesh = new THREE.Mesh(skidGeo, skidMat);
    skidMesh.position.set(0, 0.125, 0);
    skidMesh.castShadow = true;
    skidMesh.receiveShadow = true;
    group.add(skidMesh);

    // 2. Diesel Engine Block (Left/Center)
    const engineBlockGeo = new THREE.BoxGeometry(1.6, 1.1, 1.1);
    const engineBlock = new THREE.Mesh(engineBlockGeo, castIronMat);
    engineBlock.position.set(-0.6, 0.8, 0);
    engineBlock.castShadow = true;
    group.add(engineBlock);

    // Engine Cylinder Valve Covers (Twin V-bank)
    const vBank1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.45), steelMat);
    vBank1.position.set(-0.6, 1.42, 0.3);
    vBank1.rotation.x = 0.25;
    group.add(vBank1);

    const vBank2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.45), steelMat);
    vBank2.position.set(-0.6, 1.42, -0.3);
    vBank2.rotation.x = -0.25;
    group.add(vBank2);

    // 3. Alternator Generator Housing (Right side)
    const altHousingGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.4, 32);
    const altHousing = new THREE.Mesh(altHousingGeo, steelMat);
    altHousing.rotation.z = Math.PI / 2;
    altHousing.position.set(0.9, 0.8, 0);
    altHousing.castShadow = true;
    group.add(altHousing);

    // 4. ANIMATABLE ROTOR GROUP (Pivot-centered at local origin 0,0,0)
    const rotorGroup = new THREE.Group();
    rotorGroup.name = 'Generator_Rotor';
    rotorGroup.userData = { subPartId: 'rotor', pivotAxis: 'x' };
    rotorGroup.position.set(0.9, 0.8, 0); // Positioned at alternator center

    // Main Rotor Shaft along X
    const shaftGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.7, 24);
    const shaftMesh = new THREE.Mesh(shaftGeo, stainlessMat);
    shaftMesh.rotation.z = Math.PI / 2;
    rotorGroup.add(shaftMesh);

    // Copper Windings Poles on Rotor
    for (let i = 0; i < 4; i++) {
      const poleGeo = new THREE.BoxGeometry(1.0, 0.25, 0.25);
      const poleMesh = new THREE.Mesh(poleGeo, copperMat);
      poleMesh.rotation.x = (i * Math.PI) / 2;
      rotorGroup.add(poleMesh);
    }
    group.add(rotorGroup);

    // 5. Radiator & Shroud (Far Left)
    const radBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.5, 1.5), skidMat);
    radBox.position.set(-1.8, 1.0, 0);
    radBox.castShadow = true;
    group.add(radBox);

    // ANIMATABLE COOLING FAN (Pivot-centered at local origin 0,0,0)
    const fanGroup = new THREE.Group();
    fanGroup.name = 'Cooling_Fan';
    fanGroup.userData = { subPartId: 'cooling_fan', pivotAxis: 'x' };
    fanGroup.position.set(-1.6, 1.0, 0);

    const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), steelMat);
    fanHub.rotation.z = Math.PI / 2;
    fanGroup.add(fanHub);

    for (let b = 0; b < 6; b++) {
      const bladeGeo = new THREE.BoxGeometry(0.04, 0.45, 0.15);
      const blade = new THREE.Mesh(bladeGeo, yellowMat);
      blade.rotation.x = (b * Math.PI) / 3;
      blade.rotation.z = 0.2;
      blade.position.set(0, Math.sin((b * Math.PI) / 3) * 0.25, Math.cos((b * Math.PI) / 3) * 0.25);
      fanGroup.add(blade);
    }
    group.add(fanGroup);

    // 6. Exhaust Muffler Silencer & Stack (Top)
    const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 24), castIronMat);
    muffler.rotation.z = Math.PI / 2;
    muffler.position.set(-0.6, 1.9, 0);
    group.add(muffler);

    const exhaustStack = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 24), stainlessMat);
    exhaustStack.name = 'Exhaust_Stack';
    exhaustStack.userData = { subPartId: 'exhaust_stack' };
    exhaustStack.position.set(-0.6, 2.35, 0);
    group.add(exhaustStack);

    // 7. Digital Control Panel Cabinet (Right End)
    const panelBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.5), skidMat);
    panelBox.name = 'Control_Panel';
    panelBox.userData = { subPartId: 'control_panel' };
    panelBox.position.set(1.75, 1.1, 0.4);
    group.add(panelBox);

    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.18), this.materialManager.getMaterial('acrylic_glass'));
    screenMesh.rotation.y = Math.PI / 2;
    screenMesh.position.set(1.91, 1.25, 0.4);
    group.add(screenMesh);

    return group;
  }

  /**
   * Industrial Gas Turbine Generator Unit (GG)
   * With pivot-centered high-speed Turbine Rotor and Compressor Stages.
   */
  public createGasTurbineGenerator(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Gas_Turbine_Generator';
    group.userData = { isEquipmentRoot: true, assetId: 'generators.gas_turbine' };

    const steelMat = this.materialManager.getMaterial('painted_steel_blue');
    const stainlessMat = this.materialManager.getMaterial('stainless_steel');
    const darkMat = this.materialManager.getMaterial('dark_slate_skid');
    const copperMat = this.materialManager.getMaterial('brass_bronze');
    const goldMat = this.materialManager.getMaterial('hazard_yellow');

    // 1. Skid Frame
    const skid = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.3, 2.2), darkMat);
    skid.position.set(0, 0.15, 0);
    skid.castShadow = true;
    group.add(skid);

    // 2. Air Intake Bellmouth (Left)
    const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.6, 32, 1, true), stainlessMat);
    intake.rotation.z = Math.PI / 2;
    intake.position.set(-2.2, 1.2, 0);
    group.add(intake);

    // 3. Axial Compressor Housing (Tapered)
    const compHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.4, 32), steelMat);
    compHousing.rotation.z = Math.PI / 2;
    compHousing.position.set(-1.2, 1.2, 0);
    compHousing.castShadow = true;
    group.add(compHousing);

    // 4. Combustion Cannular Chamber Section (Middle)
    const combHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.8, 32), darkMat);
    combHousing.rotation.z = Math.PI / 2;
    combHousing.position.set(-0.1, 1.2, 0);
    group.add(combHousing);

    // 5. ANIMATABLE HIGH-SPEED TURBINE ROTOR (Pivot-centered at local origin 0,0,0)
    const rotorGroup = new THREE.Group();
    rotorGroup.name = 'Turbine_Rotor';
    rotorGroup.userData = { subPartId: 'turbine_rotor', pivotAxis: 'x' };
    rotorGroup.position.set(-0.7, 1.2, 0);

    // Central Shaft along X
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 24), stainlessMat);
    shaft.rotation.z = Math.PI / 2;
    rotorGroup.add(shaft);

    // Multi-stage Compressor Discs
    for (let d = 0; d < 6; d++) {
      const radius = 0.62 - d * 0.035;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.06, 24), stainlessMat);
      disc.rotation.z = Math.PI / 2;
      disc.position.set(-0.5 + d * 0.18, 0, 0);
      rotorGroup.add(disc);
    }

    // High Pressure Turbine Bladed Discs
    for (let t = 0; t < 3; t++) {
      const tDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.08, 24), copperMat);
      tDisc.rotation.z = Math.PI / 2;
      tDisc.position.set(0.7 + t * 0.2, 0, 0);
      rotorGroup.add(tDisc);
    }
    group.add(rotorGroup);

    // 6. Generator Alternator Section (Right)
    const genCasing = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.6, 32), steelMat);
    genCasing.rotation.z = Math.PI / 2;
    genCasing.position.set(1.7, 1.2, 0);
    genCasing.castShadow = true;
    group.add(genCasing);

    // 7. Exhaust Diffuser Stack (Top Right)
    const exhDuct = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.9, 24), stainlessMat);
    exhDuct.position.set(0.6, 2.0, 0);
    group.add(exhDuct);

    return group;
  }

  // =========================================================================
  // 9. PIPING & PIPE FITTINGS
  // =========================================================================

  /**
   * Straight Flanged Pipe Spool (Schedule 40 Carbon Steel)
   */
  public createStraightPipe(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Straight_Pipe_Spool';
    group.userData = { isEquipmentRoot: true, assetId: 'pipes.straight_flanged' };

    const pipeMat = this.materialManager.getMaterial('carbon_steel');
    const flangeMat = this.materialManager.getMaterial('cast_iron');
    const boltMat = this.materialManager.getMaterial('stainless_steel');

    const length = 3.0;
    const pipeRadius = 0.22;
    const flangeRadius = 0.35;
    const flangeThickness = 0.08;

    // 1. Hollow Center Pipe Body along X-axis
    const pipeGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, length - flangeThickness * 2, 28);
    const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
    pipeMesh.rotation.z = Math.PI / 2;
    pipeMesh.position.set(0, pipeRadius, 0);
    pipeMesh.castShadow = true;
    group.add(pipeMesh);

    // 2. Both End Flanges with Bolted Rings
    for (const fx of [-length / 2 + flangeThickness / 2, length / 2 - flangeThickness / 2]) {
      const flangeGeo = new THREE.CylinderGeometry(flangeRadius, flangeRadius, flangeThickness, 24);
      const flange = new THREE.Mesh(flangeGeo, flangeMat);
      flange.rotation.z = Math.PI / 2;
      flange.position.set(fx, pipeRadius, 0);
      flange.castShadow = true;
      group.add(flange);

      // Raised Face Ring
      const rfGeo = new THREE.CylinderGeometry(pipeRadius + 0.05, pipeRadius + 0.05, 0.02, 24);
      const rf = new THREE.Mesh(rfGeo, pipeMat);
      rf.rotation.z = Math.PI / 2;
      rf.position.set(fx + (fx < 0 ? -flangeThickness / 2 : flangeThickness / 2), pipeRadius, 0);
      group.add(rf);

      // 8 Flange Bolts
      for (let b = 0; b < 8; b++) {
        const bAngle = (b * Math.PI) / 4;
        const bRadius = (pipeRadius + flangeRadius) / 2;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, flangeThickness + 0.04, 8), boltMat);
        bolt.rotation.z = Math.PI / 2;
        bolt.position.set(fx, pipeRadius + bRadius * Math.sin(bAngle), bRadius * Math.cos(bAngle));
        group.add(bolt);
      }
    }

    return group;
  }

  /**
   * 90° Long-Radius Flanged Pipe Elbow Bend
   */
  public create90PipeElbow(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Pipe_Elbow_90';
    group.userData = { isEquipmentRoot: true, assetId: 'pipes.elbow_90' };

    const pipeMat = this.materialManager.getMaterial('carbon_steel');
    const flangeMat = this.materialManager.getMaterial('cast_iron');
    const boltMat = this.materialManager.getMaterial('stainless_steel');

    const bendRadius = 0.8;
    const tubeRadius = 0.22;
    const flangeRadius = 0.35;
    const flangeThick = 0.08;

    // 1. Curved Toroidal Torus 90-degree Quarter Bend
    const torusGeo = new THREE.TorusGeometry(bendRadius, tubeRadius, 16, 24, Math.PI / 2);
    const bendMesh = new THREE.Mesh(torusGeo, pipeMat);
    bendMesh.position.set(0, tubeRadius, 0);
    bendMesh.castShadow = true;
    group.add(bendMesh);

    // 2. Port 1: Bottom / X-End Flange
    const flange1 = new THREE.Mesh(new THREE.CylinderGeometry(flangeRadius, flangeRadius, flangeThick, 24), flangeMat);
    flange1.rotation.z = Math.PI / 2;
    flange1.position.set(bendRadius, tubeRadius, 0);
    group.add(flange1);

    // 3. Port 2: Top / Y-End Flange
    const flange2 = new THREE.Mesh(new THREE.CylinderGeometry(flangeRadius, flangeRadius, flangeThick, 24), flangeMat);
    flange2.position.set(0, tubeRadius + bendRadius, 0);
    group.add(flange2);

    return group;
  }

  /**
   * 45° Flanged Pipe Elbow Bend
   */
  public create45PipeElbow(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Pipe_Elbow_45';
    group.userData = { isEquipmentRoot: true, assetId: 'pipes.elbow_45' };

    const pipeMat = this.materialManager.getMaterial('carbon_steel');
    const flangeMat = this.materialManager.getMaterial('cast_iron');

    const bendRadius = 0.9;
    const tubeRadius = 0.22;
    const flangeRadius = 0.35;

    const torusGeo = new THREE.TorusGeometry(bendRadius, tubeRadius, 16, 20, Math.PI / 4);
    const bendMesh = new THREE.Mesh(torusGeo, pipeMat);
    bendMesh.position.set(0, tubeRadius, 0);
    bendMesh.castShadow = true;
    group.add(bendMesh);

    // Flange 1 at base (X=bendRadius)
    const flange1 = new THREE.Mesh(new THREE.CylinderGeometry(flangeRadius, flangeRadius, 0.08, 20), flangeMat);
    flange1.rotation.z = Math.PI / 2;
    flange1.position.set(bendRadius, tubeRadius, 0);
    group.add(flange1);

    // Flange 2 at 45 degree angle
    const fx = bendRadius * Math.cos(Math.PI / 4);
    const fy = tubeRadius + bendRadius * Math.sin(Math.PI / 4);
    const flange2 = new THREE.Mesh(new THREE.CylinderGeometry(flangeRadius, flangeRadius, 0.08, 20), flangeMat);
    flange2.rotation.z = Math.PI / 4 + Math.PI / 2;
    flange2.position.set(fx, fy, 0);
    group.add(flange2);

    return group;
  }

  /**
   * 3-Way Equal Flanged Pipe T-Joint Branch
   */
  public createPipeTee(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Pipe_Tee_Joint';
    group.userData = { isEquipmentRoot: true, assetId: 'pipes.tee_joint' };

    const pipeMat = this.materialManager.getMaterial('carbon_steel');
    const flangeMat = this.materialManager.getMaterial('cast_iron');

    const pipeRadius = 0.22;
    const runLength = 2.2;
    const branchLength = 0.8;
    const flangeRadius = 0.35;

    // Main Run Pipe along X-axis
    const runPipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, runLength - 0.16, 24), pipeMat);
    runPipe.rotation.z = Math.PI / 2;
    runPipe.position.set(0, pipeRadius, 0);
    runPipe.castShadow = true;
    group.add(runPipe);

    // Branch Pipe along Y-axis
    const branchPipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, branchLength, 24), pipeMat);
    branchPipe.position.set(0, pipeRadius + branchLength / 2, 0);
    branchPipe.castShadow = true;
    group.add(branchPipe);

    // Welded Branch Saddle Reinforcement Collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius + 0.04, pipeRadius + 0.04, 0.12, 24), flangeMat);
    collar.position.set(0, pipeRadius + 0.1, 0);
    group.add(collar);

    // 3 Flanged Connection Ports
    for (const fx of [-runLength / 2, runLength / 2]) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(flangeRadius, flangeRadius, 0.08, 20), flangeMat);
      f.rotation.z = Math.PI / 2;
      f.position.set(fx, pipeRadius, 0);
      group.add(f);
    }
    const branchFlange = new THREE.Mesh(new THREE.CylinderGeometry(flangeRadius, flangeRadius, 0.08, 20), flangeMat);
    branchFlange.position.set(0, pipeRadius + branchLength, 0);
    group.add(branchFlange);

    return group;
  }

  /**
   * 4-Way Flanged Pipe Cross Junction
   */
  public createPipeCross(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Pipe_Cross_Joint';
    group.userData = { isEquipmentRoot: true, assetId: 'pipes.cross_joint' };

    const pipeMat = this.materialManager.getMaterial('carbon_steel');
    const flangeMat = this.materialManager.getMaterial('cast_iron');

    const pipeRadius = 0.22;
    const length = 2.2;
    const flangeRadius = 0.35;

    // Run 1 along X
    const runX = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, length - 0.16, 24), pipeMat);
    runX.rotation.z = Math.PI / 2;
    runX.position.set(0, pipeRadius, 0);
    runX.castShadow = true;
    group.add(runX);

    // Run 2 along Z
    const runZ = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, length - 0.16, 24), pipeMat);
    runZ.rotation.x = Math.PI / 2;
    runZ.position.set(0, pipeRadius, 0);
    runZ.castShadow = true;
    group.add(runZ);

    // 4 Flanges
    for (const fx of [-length / 2, length / 2]) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(flangeRadius, flangeRadius, 0.08, 20), flangeMat);
      f.rotation.z = Math.PI / 2;
      f.position.set(fx, pipeRadius, 0);
      group.add(f);
    }
    for (const fz of [-length / 2, length / 2]) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(flangeRadius, flangeRadius, 0.08, 20), flangeMat);
      f.rotation.x = Math.PI / 2;
      f.position.set(0, pipeRadius, fz);
      group.add(f);
    }

    return group;
  }

  /**
   * Concentric Conical Pipe Reducer Spool
   */
  public createPipeReducer(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Pipe_Reducer_Conical';
    group.userData = { isEquipmentRoot: true, assetId: 'pipes.reducer_conical' };

    const pipeMat = this.materialManager.getMaterial('carbon_steel');
    const flangeMat = this.materialManager.getMaterial('cast_iron');

    const largeR = 0.30;
    const smallR = 0.18;
    const length = 1.6;

    // Conical Taper Body along X
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(largeR, smallR, length - 0.16, 28), pipeMat);
    cone.rotation.z = Math.PI / 2;
    cone.position.set(0, largeR, 0);
    cone.castShadow = true;
    group.add(cone);

    // Large End Flange (Left)
    const largeFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.08, 24), flangeMat);
    largeFlange.rotation.z = Math.PI / 2;
    largeFlange.position.set(-length / 2, largeR, 0);
    group.add(largeFlange);

    // Small End Flange (Right)
    const smallFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.08, 24), flangeMat);
    smallFlange.rotation.z = Math.PI / 2;
    smallFlange.position.set(length / 2, largeR, 0);
    group.add(smallFlange);

    return group;
  }

  /**
   * Bolted Weld-Neck Flange Pair Joint with Gasket
   */
  public createFlangePairJoint(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Flange_Pair_Joint';
    group.userData = { isEquipmentRoot: true, assetId: 'pipes.flange_joint' };

    const pipeMat = this.materialManager.getMaterial('carbon_steel');
    const flangeMat = this.materialManager.getMaterial('cast_iron');
    const gasketMat = this.materialManager.getMaterial('safety_yellow');
    const boltMat = this.materialManager.getMaterial('stainless_steel');

    const flangeR = 0.36;
    const pipeR = 0.22;

    // Dual Mating Flanges
    for (const fx of [-0.045, 0.045]) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(flangeR, flangeR, 0.08, 24), flangeMat);
      f.rotation.z = Math.PI / 2;
      f.position.set(fx, flangeR, 0);
      group.add(f);

      // Pipe Hub Extension
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(pipeR + 0.03, pipeR, 0.15, 24), pipeMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(fx + (fx < 0 ? -0.11 : 0.11), flangeR, 0);
      group.add(hub);
    }

    // High-Contrast Gasket Ring between flanges
    const gasket = new THREE.Mesh(new THREE.CylinderGeometry(flangeR - 0.02, flangeR - 0.02, 0.015, 24), gasketMat);
    gasket.rotation.z = Math.PI / 2;
    gasket.position.set(0, flangeR, 0);
    group.add(gasket);

    // 8 Clamping Hex Bolts
    for (let b = 0; b < 8; b++) {
      const bAngle = (b * Math.PI) / 4;
      const bRad = 0.29;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 8), boltMat);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(0, flangeR + bRad * Math.sin(bAngle), bRad * Math.cos(bAngle));
      group.add(bolt);
    }

    return group;
  }

  // =========================================================================
  // 10. DUCTS & HVAC VENTILATION
  // =========================================================================

  /**
   * Straight Rectangular Galvanized Sheet Metal Duct
   */
  public createRectangularDuct(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Rectangular_Duct_Straight';
    group.userData = { isEquipmentRoot: true, assetId: 'ducts.straight_rectangular' };

    const ductMat = this.materialManager.getMaterial('galvanized_zinc');
    const flangeMat = this.materialManager.getMaterial('dark_slate_skid');

    const width = 1.4;
    const height = 0.8;
    const length = 3.0;

    // Main Rectangular Body
    const ductMesh = new THREE.Mesh(new THREE.BoxGeometry(length - 0.1, height, width), ductMat);
    ductMesh.position.set(0, height / 2 + 0.1, 0);
    ductMesh.castShadow = true;
    group.add(ductMesh);

    // Transverse Duct Flange (TDF) Connector Frames at both ends
    for (const fx of [-length / 2 + 0.025, length / 2 - 0.025]) {
      const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, height + 0.08, width + 0.08), flangeMat);
      frameMesh.position.set(fx, height / 2 + 0.1, 0);
      group.add(frameMesh);
    }

    // Stiffener Crease Cross-Breaks (Center Band)
    const ribMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, height + 0.02, width + 0.02), flangeMat);
    ribMesh.position.set(0, height / 2 + 0.1, 0);
    group.add(ribMesh);

    return group;
  }

  /**
   * 90° Curved Rectangular Duct Elbow with Turning Vanes
   */
  public create90RectangularDuctElbow(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Rectangular_Duct_Elbow_90';
    group.userData = { isEquipmentRoot: true, assetId: 'ducts.elbow_90_rectangular' };

    const ductMat = this.materialManager.getMaterial('galvanized_zinc');
    const flangeMat = this.materialManager.getMaterial('dark_slate_skid');
    const vaneMat = this.materialManager.getMaterial('stainless_steel');

    const w = 1.2;
    const h = 0.8;
    const radius = 1.1;

    // Extruded curved rectangular sweep
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, h);
    shape.lineTo(w, h);
    shape.lineTo(w, 0);
    shape.closePath();

    // Curved Elbow Block
    const elbowMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius + w / 2, radius - w / 2, h, 20, 1, false, 0, Math.PI / 2), ductMat);
    elbowMesh.position.set(0, h / 2 + 0.1, 0);
    elbowMesh.castShadow = true;
    group.add(elbowMesh);

    // End Connecting Flanges
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, h + 0.08, w + 0.08), flangeMat);
    f1.position.set(radius, h / 2 + 0.1, 0);
    group.add(f1);

    const f2 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.06), flangeMat);
    f2.position.set(0, h / 2 + 0.1, radius);
    group.add(f2);

    // 3 Turning Guide Vanes inside elbow
    for (let v = 1; v <= 3; v++) {
      const vRad = radius - w / 2 + (v * w) / 4;
      const vane = new THREE.Mesh(new THREE.CylinderGeometry(vRad, vRad, h - 0.05, 16, 1, true, 0, Math.PI / 2), vaneMat);
      vane.position.set(0, h / 2 + 0.1, 0);
      group.add(vane);
    }

    return group;
  }

  /**
   * Rectangular to Round Duct Transition Fitting
   */
  public createDuctTransition(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Duct_Transition_Rect_Round';
    group.userData = { isEquipmentRoot: true, assetId: 'ducts.transition_rect_to_round' };

    const ductMat = this.materialManager.getMaterial('galvanized_zinc');
    const flangeMat = this.materialManager.getMaterial('dark_slate_skid');

    const length = 1.8;
    const rectW = 1.2;
    const rectH = 0.8;
    const roundR = 0.35;

    // Transition Taper (approximated with smooth segmented geometry)
    const transitionMesh = new THREE.Mesh(new THREE.CylinderGeometry(roundR, Math.max(rectW, rectH) / 2, length - 0.2, 24), ductMat);
    transitionMesh.rotation.z = Math.PI / 2;
    transitionMesh.position.set(0, rectH / 2 + 0.1, 0);
    transitionMesh.castShadow = true;
    group.add(transitionMesh);

    // Rectangular Flange on Left
    const rectFlange = new THREE.Mesh(new THREE.BoxGeometry(0.06, rectH + 0.08, rectW + 0.08), flangeMat);
    rectFlange.position.set(-length / 2, rectH / 2 + 0.1, 0);
    group.add(rectFlange);

    // Round Collar Ring on Right
    const roundCollar = new THREE.Mesh(new THREE.CylinderGeometry(roundR + 0.03, roundR + 0.03, 0.1, 24), flangeMat);
    roundCollar.rotation.z = Math.PI / 2;
    roundCollar.position.set(length / 2, rectH / 2 + 0.1, 0);
    group.add(roundCollar);

    return group;
  }

  /**
   * Spiral Round Galvanized Steel Air Duct
   */
  public createSpiralRoundDuct(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Spiral_Round_Duct';
    group.userData = { isEquipmentRoot: true, assetId: 'ducts.spiral_round_straight' };

    const ductMat = this.materialManager.getMaterial('galvanized_zinc');
    const ribMat = this.materialManager.getMaterial('stainless_steel');

    const radius = 0.35;
    const length = 3.2;

    // Main Smooth Cylinder
    const ductMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), ductMat);
    ductMesh.rotation.z = Math.PI / 2;
    ductMesh.position.set(0, radius + 0.1, 0);
    ductMesh.castShadow = true;
    group.add(ductMesh);

    // Helical Lockseam Reinforcing Rings
    for (let r = 0; r < 8; r++) {
      const rx = -length / 2 + 0.2 + (r * (length - 0.4)) / 7;
      const seam = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.008, 0.008, 8, 32), ribMat);
      seam.rotation.y = Math.PI / 2;
      seam.position.set(rx, radius + 0.1, 0);
      group.add(seam);
    }

    return group;
  }

  /**
   * 90° 5-Segment Mitered Round Duct Elbow
   */
  public create90RoundDuctElbow(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Round_Duct_Elbow_90';
    group.userData = { isEquipmentRoot: true, assetId: 'ducts.elbow_90_round_spiral' };

    const ductMat = this.materialManager.getMaterial('galvanized_zinc');
    const seamMat = this.materialManager.getMaterial('dark_slate_skid');

    const radius = 0.35;
    const bendR = 0.9;

    // Smooth Toroidal Elbow Bend
    const bendGeo = new THREE.TorusGeometry(bendR, radius, 16, 24, Math.PI / 2);
    const bendMesh = new THREE.Mesh(bendGeo, ductMat);
    bendMesh.position.set(0, radius + 0.1, 0);
    bendMesh.castShadow = true;
    group.add(bendMesh);

    // Miter Joint Seam Lines
    for (let s = 1; s <= 4; s++) {
      const sAngle = (s * Math.PI) / 10;
      const sx = bendR * Math.cos(sAngle);
      const sy = radius + 0.1 + bendR * Math.sin(sAngle);
      const seam = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.006, 0.008, 8, 24), seamMat);
      seam.position.set(sx, sy, 0);
      seam.rotation.z = sAngle + Math.PI / 2;
      group.add(seam);
    }

    return group;
  }

  /**
   * Rectangular Duct 90° T-Takeoff Branch
   */
  public createRectangularDuctTee(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Rectangular_Duct_Tee';
    group.userData = { isEquipmentRoot: true, assetId: 'ducts.tee_branch_rectangular' };

    const ductMat = this.materialManager.getMaterial('galvanized_zinc');
    const flangeMat = this.materialManager.getMaterial('dark_slate_skid');

    const w = 1.4;
    const h = 0.8;
    const mainL = 2.6;
    const branchL = 1.0;

    // Main Trunk along X
    const mainDuct = new THREE.Mesh(new THREE.BoxGeometry(mainL - 0.1, h, w), ductMat);
    mainDuct.position.set(0, h / 2 + 0.1, 0);
    mainDuct.castShadow = true;
    group.add(mainDuct);

    // Branch Takeoff along Z
    const branchDuct = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, h, branchL), ductMat);
    branchDuct.position.set(0, h / 2 + 0.1, w / 2 + branchL / 2);
    branchDuct.castShadow = true;
    group.add(branchDuct);

    // Connecting Flanges on all 3 Openings
    for (const fx of [-mainL / 2 + 0.025, mainL / 2 - 0.025]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, h + 0.08, w + 0.08), flangeMat);
      f.position.set(fx, h / 2 + 0.1, 0);
      group.add(f);
    }
    const branchFlange = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7 + 0.08, h + 0.08, 0.06), flangeMat);
    branchFlange.position.set(0, h / 2 + 0.1, w / 2 + branchL);
    group.add(branchFlange);

    return group;
  }
}
