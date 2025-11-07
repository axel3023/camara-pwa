if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
    .then(function(registration) {
        console.log('Service Worker registered with scope:', registration.scope);
    })    .catch(function(error) {
        console.log('Service Worker registration failed:', error);
    });
}


const openCameraBtn = document.getElementById('openCamera');
const cameraContainer = document.getElementById('cameraContainer');
const video = document.getElementById('video');
const takePhotoBtn = document.getElementById('takePhoto');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d'); 

const clearPhotosBtn = document.getElementById('clearPhotosBtn'); 
const photoGallery = document.getElementById('photoGallery'); 

let stream = null; 



async function openCamera() {
    try {
        const constraints = {
            video: {
                
                facingMode: { ideal: 'user' }, 
                width: { ideal: 320 },
                height: { ideal: 240 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        video.srcObject = stream;
        
        cameraContainer.style.display = 'block';
        openCameraBtn.textContent = 'Cámara Abierta';
        openCameraBtn.disabled = true;
        
        console.log('Cámara abierta exitosamente (frontal)');
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
    }
}

function takePhoto() {
    if (!stream) {
        alert('Primero debes abrir la cámara');
        return;
    }

    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    
    const imageDataURL = canvas.toDataURL('image/jpeg', 0.8);
    
    
    savePhoto(imageDataURL).then(() => {
        loadAndRenderPhotos(); 
    });
    
    console.log('Foto capturada en base64:', imageDataURL.length, 'caracteres');
    
   
    closeCamera(); 
}

function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null; 

        video.srcObject = null;
        cameraContainer.style.display = 'none';
        
        openCameraBtn.textContent = 'Abrir Cámara';
        openCameraBtn.disabled = false;
        
        console.log('Cámara cerrada');
    }
}



const DB_NAME = 'CamaraPhotoDB';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = event => {
            console.error('Error abriendo IndexedDB:', event.target.errorCode);
            reject(event.target.errorCode);
        };

        request.onsuccess = event => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true }); 
                console.log('Object Store creado:', STORE_NAME);
            }
        };
    });
}

async function savePhoto(imageDataURL) {
    if (!db) await openDB(); 

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const photo = { timestamp: new Date().getTime(), dataURL: imageDataURL }; 
        const request = store.add(photo);

        request.onsuccess = () => resolve(request.result);
        request.onerror = event => {
            console.error('Error al guardar la foto:', event.target.error);
            reject(event.target.error);
        };
    });
}

async function loadAndRenderPhotos() {
    if (!db) await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll(); 

        request.onsuccess = event => {
            const photos = event.target.result;
            renderGallery(photos); 
            resolve(photos);
        };

        request.onerror = event => reject(event.target.error);
    });
}

async function clearAllPhotos() {
    if (!db) await openDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear(); 

        request.onsuccess = () => {
            console.log('Todas las fotos eliminadas de la base de datos.');
            loadAndRenderPhotos(); 
            resolve();
        };

        request.onerror = event => reject(event.target.error);
    });
}

async function deletePhoto(id) {
    if (!db) await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id); 

        request.onsuccess = () => {
         
            console.log('Foto eliminada con id:', id); 
            loadAndRenderPhotos(); 
            resolve();
        };

        request.onerror = event => reject(event.target.error);
    });
}



function renderGallery(photos) {
    photoGallery.innerHTML = ''; 

    if (photos.length === 0) {
        photoGallery.innerHTML = '<p id="emptyGalleryMsg">La galería está vacía.</p>';
        return;
    }

    photos.forEach(photo => {
        const img = document.createElement('img');
        img.src = photo.dataURL;
        img.title = 'Tomada el: ' + new Date(photo.timestamp).toLocaleString();
        
      
        img.addEventListener('click', () => {
            deletePhoto(photo.id); 
        });

        photoGallery.appendChild(img);
    });
}





openCameraBtn.addEventListener('click', openCamera);
takePhotoBtn.addEventListener('click', takePhoto);

clearPhotosBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres borrar TODAS las fotos de la galería? Esta acción es irreversible.')) {
        clearAllPhotos();
    }
}); 


document.addEventListener('DOMContentLoaded', async () => {
    try {
        await openDB(); 
        loadAndRenderPhotos(); 
    } catch (e) {
        console.error('Fallo al inicializar la aplicación:', e);
    }
});


window.addEventListener('beforeunload', () => {
    closeCamera();

});
