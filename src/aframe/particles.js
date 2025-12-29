export function registerFloatingParticles() {
  if (typeof window === 'undefined' || !window.AFRAME) return;
  const { AFRAME } = window;

  if (AFRAME.components['floating-particles']) return;

  AFRAME.registerComponent('floating-particles', {
    schema: {
      density: { type: 'int', default: 150 },
      speed: { type: 'number', default: 0.3 },
      size: { type: 'number', default: 0.05 },
      color: { type: 'color', default: '#ffffff' },
      vrOnly: { type: 'boolean', default: false },
      active: { type: 'boolean', default: false },
    },

    init() {
      const { density, size, color } = this.data;
      const { THREE } = AFRAME;
      const count = Math.max(0, density);
      const range = 3;

      this.range = range;
      this.positions = new Float32Array(count * 3);
      this.velocities = new Float32Array(count * 3);

      const randomInRange = () => (Math.random() - 0.5) * 2 * range;

      for (let i = 0; i < count; i += 1) {
        const idx = i * 3;
        this.positions[idx] = randomInRange();
        this.positions[idx + 1] = randomInRange();
        this.positions[idx + 2] = randomInRange();

        this.velocities[idx] = (Math.random() - 0.5) * 0.4;
        this.velocities[idx + 1] = Math.random() * 0.6 + 0.1;
        this.velocities[idx + 2] = (Math.random() - 0.5) * 0.4;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

      const material = new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });

      this.points = new THREE.Points(geometry, material);
      this.el.setObject3D('floating-particles', this.points);
    },

    tick(time, timeDelta) {
      if (!this.points || !this.positions || !this.velocities) return;

      const { vrOnly, speed, active } = this.data;
      const deltaSeconds = (timeDelta || 16) / 1000;
      const { range } = this;

      if (!active) {
        this.points.visible = false;
        return;
      }

      if (vrOnly && this.el.sceneEl) {
        this.points.visible = this.el.sceneEl.is('vr-mode');
      } else {
        this.points.visible = true;
      }

      for (let i = 0; i < this.positions.length; i += 3) {
        this.positions[i] += this.velocities[i] * deltaSeconds * speed;
        this.positions[i + 1] += this.velocities[i + 1] * deltaSeconds * speed;
        this.positions[i + 2] += this.velocities[i + 2] * deltaSeconds * speed;

        if (this.positions[i] > range) this.positions[i] = -range;
        if (this.positions[i] < -range) this.positions[i] = range;

        if (this.positions[i + 1] > range) this.positions[i + 1] = -range;
        if (this.positions[i + 1] < -range) this.positions[i + 1] = range;

        if (this.positions[i + 2] > range) this.positions[i + 2] = -range;
        if (this.positions[i + 2] < -range) this.positions[i + 2] = range;
      }

      this.points.geometry.attributes.position.needsUpdate = true;
    },

    remove() {
      if (this.points) {
        this.el.removeObject3D('floating-particles');
        this.points.geometry.dispose();
        this.points.material.dispose();
      }
    },
  });
}
