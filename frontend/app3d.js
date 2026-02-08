// CHAPLIN 3D - WebGL/Three.js Y2K Social
class Chaplin3D {
    constructor() {
        // Configuración
        this.config = {
            spiralRadius: 8,
            spiralHeight: 2,
            totalPosts: 20,
            postScale: 1,
            rotationSpeed: 0.001,
            autoRotate: true,
            colors: {
                neonCyan: 0x00ffff,
                neonPink: 0xff00ff,
                neonGreen: 0x00ff88,
                neonYellow: 0xffff00,
                darkBg: 0x0a0a0f
            }
        };

        // Estado
        this.currentPost = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.zoomLevel = 1;
        this.isRotating = true;
        this.posts = [];
        this.fps = 60;

        // Inicializar
        this.init();
        this.createSpiral();
        this.createPosts();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        // Escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.colors.darkBg);
        this.scene.fog = new THREE.Fog(this.config.colors.darkBg, 10, 30);

        // Cámara
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 15);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('canvas3d'),
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Controles
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.maxPolarAngle = Math.PI / 2;

        // Luces
        this.setupLights();

        // Efectos
        this.setupEffects();

        // Estrellas de fondo
        this.createStars();

        // Grid futurista
        this.createGrid();

        console.log('🚀 Chaplin 3D inicializado');
    }

    setupLights() {
        // Luz ambiental
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Luz direccional (sol)
        const directionalLight = new THREE.DirectionalLight(this.config.colors.neonCyan, 0.8);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Luces de neón puntuales
        const neonLights = [
            { color: this.config.colors.neonPink, position: [5, 3, 5] },
            { color: this.config.colors.neonGreen, position: [-5, 3, -5] },
            { color: this.config.colors.neonYellow, position: [0, 8, 0] }
        ];

        neonLights.forEach(light => {
            const pointLight = new THREE.PointLight(light.color, 0.6, 20);
            pointLight.position.set(...light.position);
            pointLight.castShadow = true;
            this.scene.add(pointLight);

            // Glow effect
            const glowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: light.color,
                transparent: true,
                opacity: 0.7
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.set(...light.position);
            this.scene.add(glow);
        });

        // Luz de relleno
        const fillLight = new THREE.HemisphereLight(
            this.config.colors.neonCyan,
            this.config.colors.darkBg,
            0.3
        );
        this.scene.add(fillLight);
    }

    setupEffects() {
        // Post-processing sería añadido aquí
        console.log('Efectos 3D configurados');
    }

    createStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.1,
            transparent: true
        });

        const starVertices = [];
        for (let i = 0; i < 1000; i++) {
            const x = (Math.random() - 0.5) * 100;
            const y = (Math.random() - 0.5) * 100;
            const z = (Math.random() - 0.5) * 100;
            starVertices.push(x, y, z);
        }

        starGeometry.setAttribute('position',
            new THREE.Float32BufferAttribute(starVertices, 3));

        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    createGrid() {
        const gridHelper = new THREE.GridHelper(30, 30,
            this.config.colors.neonCyan,
            this.config.colors.neonCyan
        );
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);

        // Ejes 3D
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
    }

    createSpiral() {
        // Espiral base (tubo 3D)
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(2, 1, 2),
            new THREE.Vector3(-2, 2, -2),
            new THREE.Vector3(2, 3, 2),
            new THREE.Vector3(-2, 4, -2),
            new THREE.Vector3(0, 5, 0)
        ]);

        const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.1, 8, false);
        const tubeMaterial = new THREE.MeshPhongMaterial({
            color: this.config.colors.neonPink,
            emissive: this.config.colors.neonPink,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.5
        });

        this.spiral = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.scene.add(this.spiral);
    }

    createPosts() {
        // Crear posts 3D en espiral
        for (let i = 0; i < this.config.totalPosts; i++) {
            const angle = (i / this.config.totalPosts) * Math.PI * 4;
            const radius = this.config.spiralRadius;
            const height = i * this.config.spiralHeight;

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = height - (this.config.totalPosts * this.config.spiralHeight / 2);

            this.createPostCube(x, y, z, angle, i);
        }
    }

    createPostCube(x, y, z, rotation, index) {
        // Geometría del post (cubo con efectos)
        const geometry = new THREE.BoxGeometry(1.5, 1.5, 0.2);

        // Material neón
        const material = new THREE.MeshPhongMaterial({
            color: index % 3 === 0 ? this.config.colors.neonCyan :
                   index % 3 === 1 ? this.config.colors.neonPink :
                   this.config.colors.neonGreen,
            emissive: index % 3 === 0 ? this.config.colors.neonCyan :
                     index % 3 === 1 ? this.config.colors.neonPink :
                     this.config.colors.neonGreen,
            emissiveIntensity: 0.3,
            shininess: 100,
            transparent: true,
            opacity: 0.9
        });

        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);
        cube.rotation.y = rotation;
        cube.userData = {
            id: index,
            type: 'post',
            likes: Math.floor(Math.random() * 100),
            comments: Math.floor(Math.random() * 50),
            title: `POST_3D_${String(index).padStart(3, '0')}`,
            content: `Contenido 3D del post ${index} en espiral Y2K`,
            tags: ['#3D', '#Y2K', '#Futuro', '#Social']
        };

        // Añadir glow
        const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({
                color: 0xffffff,
                linewidth: 2,
                transparent: true,
                opacity: 0.5
            })
        );
        cube.add(wireframe);

        // Texto flotante (simulado con sprite)
        this.createPostLabel(cube, index);

        this.scene.add(cube);
        this.posts.push(cube);

        return cube;
    }

    createPostLabel(cube, index) {
        // En una implementación real usarías TextGeometry o sprites
        // Por ahora usamos un pequeño indicador
        const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });

        const indicator = new THREE.Mesh(sphereGeometry, sphereMaterial);
        indicator.position.y = 1.2;
        cube.add(indicator);
    }

    setupEventListeners() {
        // Mouse interaction
        document.addEventListener('mousemove', (e) => {
            this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // Click en posts
        this.renderer.domElement.addEventListener('click', (e) => {
            const mouse = new THREE.Vector2(
                (e.clientX / window.innerWidth) * 2 - 1,
                -(e.clientY / window.innerHeight) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);

            const intersects = raycaster.intersectObjects(this.posts);

            if (intersects.length > 0) {
                const post = intersects[0].object;
                this.selectPost(post.userData);
            }
        });

        // Botones de control
        document.getElementById('btnRadio').addEventListener('click', () => {
            this.toggleRadio();
        });

        document.getElementById('btnPost').addEventListener('click', () => {
            this.createNewPost();
        });

        document.getElementById('btnProfile').addEventListener('click', () => {
            this.showProfile();
        });

        document.getElementById('btnZoom').addEventListener('click', () => {
            this.toggleZoom();
        });

        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Teclado
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case ' ':
                    this.isRotating = !this.isRotating;
                    break;
                case 'r':
                    this.resetCamera();
                    break;
                case '+':
                    this.zoomIn();
                    break;
                case '-':
                    this.zoomOut();
                    break;
            }
        });
    }

    selectPost(postData) {
        this.currentPost = postData.id;

        // Actualizar UI
        document.getElementById('currentPostTitle').textContent = postData.title;
        document.getElementById('currentPostContent').textContent = postData.content;
        document.getElementById('postLikes').textContent = postData.likes;
        document.getElementById('postComments').textContent = postData.comments;

        // Actualizar tags
        const tagsContainer = document.getElementById('currentPostTags');
        tagsContainer.innerHTML = postData.tags.map(tag =>
            `<span class="tag-3d">${tag}</span>`
        ).join('');

        // Efecto visual en el post seleccionado
        this.posts.forEach((post, i) => {
            if (i === postData.id) {
                post.material.emissiveIntensity = 1.0;
                post.scale.set(1.2, 1.2, 1.2);
            } else {
                post.material.emissiveIntensity = 0.3;
                post.scale.set(1.0, 1.0, 1.0);
            }
        });

        console.log(`📱 Post seleccionado: ${postData.title}`);
    }

    toggleRadio() {
        const audio = document.getElementById('bgMusic');
        const btn = document.getElementById('btnRadio');

        if (audio.paused) {
            audio.play();
            btn.classList.add('pulse');
            btn.innerHTML = '<i class="fas fa-pause"></i>';
            document.getElementById('radioListeners').textContent =
                Math.floor(Math.random() * 50) + 20;
        } else {
            audio.pause();
            btn.classList.remove('pulse');
            btn.innerHTML = '<i class="fas fa-broadcast-tower"></i>';
        }
    }

    createNewPost() {
        // Crear un nuevo post 3D
        const newIndex = this.posts.length;
        const angle = (newIndex / this.config.totalPosts) * Math.PI * 4;
        const radius = this.config.spiralRadius;
        const height = newIndex * this.config.spiralHeight;

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = height - (this.config.totalPosts * this.config.spiralHeight / 2);

        const newPost = this.createPostCube(x, y, z, angle, newIndex);

        // Animación de entrada
        newPost.scale.set(0.1, 0.1, 0.1);

        const scaleUp = () => {
            if (newPost.scale.x < 1) {
                newPost.scale.x += 0.05;
                newPost.scale.y += 0.05;
                newPost.scale.z += 0.05;
                requestAnimationFrame(scaleUp);
            }
        };
        scaleUp();

        // Actualizar contador
        document.getElementById('postCount').textContent = this.posts.length;
    }

    showProfile() {
        alert('Perfil 3D - En desarrollo');
        // Aquí se abriría un modal o cambiaría a vista de perfil
    }

    toggleZoom() {
        this.zoomLevel = this.zoomLevel === 1 ? 2 : 1;
        this.camera.position.z = 15 / this.zoomLevel;
    }

    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel + 0.1, 3);
        this.camera.position.z = 15 / this.zoomLevel;
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel - 0.1, 0.5);
        this.camera.position.z = 15 / this.zoomLevel;
    }

    resetCamera() {
        this.camera.position.set(0, 5, 15);
        this.controls.reset();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Rotación automática
        if (this.isRotating) {
            this.spiral.rotation.y += this.config.rotationSpeed;
            this.posts.forEach((post, i) => {
                post.rotation.y += this.config.rotationSpeed * (i % 2 === 0 ? 1 : -1);

                // Efecto de flotación
                post.position.y += Math.sin(Date.now() * 0.001 + i) * 0.002;
            });
        }

        // Efecto de movimiento con mouse
        this.camera.position.x += (this.mouseX * 2 - this.camera.position.x) * 0.05;
        this.camera.position.y += (this.mouseY * 2 - this.camera.position.y) * 0.05;

        // Actualizar controles
        this.controls.update();

        // Render
        this.renderer.render(this.scene, this.camera);

        // FPS counter
        this.updateFPSCounter();
    }

    updateFPSCounter() {
        const now = performance.now();
        if (!this.lastTime) this.lastTime = now;

        const delta = now - this.lastTime;
        this.lastTime = now;

        this.fps = Math.round(1000 / delta);

        // Actualizar solo cada segundo
        if (now % 1000 < 16) {
            document.getElementById('fpsCounter').textContent = this.fps;

            // Simular usuarios online (cambios aleatorios)
            const onlineUsers = document.getElementById('onlineUsers');
            const current = parseInt(onlineUsers.textContent);
            const change = Math.random() > 0.5 ? 1 : -1;
            onlineUsers.textContent = Math.max(100, current + change);
        }
    }
}

// Inicializar cuando la página cargue
window.addEventListener('DOMContentLoaded', () => {
    // Ocultar loading
    setTimeout(() => {
        document.querySelector('.loading')?.remove();
    }, 1000);

    // Iniciar Chaplin 3D
    window.chaplin3d = new Chaplin3D();

    // Añadir loading screen temporal
    if (!document.querySelector('.loading')) {
        const loading = document.createElement('div');
        loading.className = 'loading';
        loading.innerHTML = '<div>INICIALIZANDO CHAPLIN 3D...</div>';
        document.body.appendChild(loading);

        setTimeout(() => loading.remove(), 2000);
    }
});