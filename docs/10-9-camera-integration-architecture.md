# 9. Camera Integration Architecture

## 9.1 Abstraction Layer

The system uses a camera abstraction layer. The main application should not directly depend on one camera brand.

```
                Camera Manager
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
   Canon Adapter   Nikon Adapter   Sony Adapter
         │             │             │
         ▼             ▼             ▼
    Camera SDK      Camera SDK     Camera SDK
         │             │             │
         ▼             ▼             ▼
      DSLR           DSLR          DSLR
```

## 9.2 Camera Interface Contract

All camera adapters must implement a common interface:

```python
class CameraInterface(ABC):
    """Abstract interface for all camera adapters."""

    @abstractmethod
    def connect(self) -> bool:
        """Establish connection to the camera."""

    @abstractmethod
    def disconnect(self) -> None:
        """Disconnect from the camera."""

    @abstractmethod
    def get_camera_status(self) -> CameraStatus:
        """Return current camera status (connected, battery, storage, etc.)."""

    @abstractmethod
    def start_live_view(self) -> None:
        """Begin streaming live view frames from the camera."""

    @abstractmethod
    def stop_live_view(self) -> None:
        """Stop the live view stream."""

    @abstractmethod
    def get_preview_frame(self) -> np.ndarray:
        """Return the current live view frame as a NumPy array (BGR)."""

    @abstractmethod
    def capture_photo(self) -> CaptureResult:
        """Trigger the camera shutter and return capture result."""

    @abstractmethod
    def get_captured_image(self) -> bytes:
        """Download the most recently captured image from the camera."""

    @abstractmethod
    def get_camera_info(self) -> CameraInfo:
        """Return camera model, serial number, firmware version, etc."""
```

The customer application simply calls:

```python
camera_manager.capture_photo()
```

The appropriate camera adapter handles the manufacturer-specific implementation.

## 9.3 Camera Integration Strategy

### Phase 1 — Single Camera Support

Support only the exact DSLR model currently installed in the real photobooth.

```
Visit Booth
     ↓
Identify DSLR (brand, exact model)
     ↓
Find Official SDK/API
     ↓
Build Adapter
     ↓
Test Live View
     ↓
Test Capture
```

### Phase 2 — Additional Camera Support

Introduce additional camera adapters as needed:

```
CameraAdapter
    ├── CanonAdapter    (via Canon EDSDK)
    ├── NikonAdapter    (via Nikon SDK)
    └── SonyAdapter     (via Sony Remote SDK)
```

This allows future expansion without rewriting the main application.

### Phase 3 — Mock Camera for Development

A `MockCameraAdapter` should be created early for development without physical hardware:

```python
class MockCameraAdapter(CameraInterface):
    """Simulates a camera using local image files or webcam."""

    def connect(self) -> bool:
        return True  # Always succeeds

    def get_preview_frame(self) -> np.ndarray:
        # Return webcam frame or looping test video
        return self._webcam.read()

    def capture_photo(self) -> CaptureResult:
        # Return a sample high-res image
        return CaptureResult(
            success=True,
            image_path="mock/sample_capture.jpg",
            timestamp=datetime.now()
        )
```

> **Why this matters:** Developers working on the UI, template engine, and printing should not be blocked by the absence of a physical DSLR. The mock camera lets the entire flow work end-to-end on any development machine.

---