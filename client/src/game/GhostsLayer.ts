import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import type { PlayerSnapshot } from "../store/useRoom";
import { CarController } from "./CarController";

export class GhostsLayer {
  private readonly labels = new Map<string, Mesh>();

  constructor(private readonly scene: Scene, private readonly carController: CarController) {}

  sync(players: Record<string, PlayerSnapshot>, localId?: string) {
    const active = new Set<string>();

    Object.values(players).forEach((player) => {
      active.add(player.id);
      const car = this.carController.getMesh(player.id);
      if (!car) {
        return;
      }

      const label = this.labels.get(player.id) ?? this.createLabel(player.id, car);
      this.labels.set(player.id, label);

      // Mantém o rótulo fixo acima do carro no espaço local
      label.position.x = 0;
      label.position.y = 2;
      label.position.z = 0;

      const material = label.material as StandardMaterial | null;
      const texture = material?.diffuseTexture as DynamicTexture | undefined;
      if (texture) {
        texture.clear();
        // Adicionar "(Você)" para o jogador local
        const displayName = player.id === localId
          ? `${player.name ?? "Driver"} (Você)`
          : player.name ?? "Driver";
        texture.drawText(displayName, null, 42, "28px Arial", "white", "transparent", true);
      }
    });

    this.labels.forEach((label, id) => {
      if (!active.has(id)) {
        label.dispose(false, true);
        this.labels.delete(id);
      }
    });
  }

  dispose() {
    this.labels.forEach((label) => label.dispose(false, true));
    this.labels.clear();
  }

  private createLabel(id: string, parent: Mesh): Mesh {
    const plane = MeshBuilder.CreatePlane(`label-${id}`, { width: 2, height: 0.6 }, this.scene);
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;
    plane.parent = parent;

    const texture = new DynamicTexture(`label-texture-${id}`, { width: 256, height: 64 }, this.scene, false);
    const material = new StandardMaterial(`label-material-${id}`, this.scene);
    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(0.8, 0.8, 0.8);
    material.specularColor = Color3.Black();
    material.alpha = 1;
    plane.material = material;

    return plane;
  }
}
