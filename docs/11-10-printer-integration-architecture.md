# 10. Printer Integration Architecture

## 10.1 Abstraction Layer

```
                Printer Manager
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
       Windows       DNP        Other Vendor
       Print API     Adapter      Adapter
          │            │            │
          └────────────┼────────────┘
                       ▼
                    PRINTER
```

## 10.2 Printer Interface Contract

```python
class PrinterInterface(ABC):
    """Abstract interface for all printer adapters."""

    @abstractmethod
    def get_printer_status(self) -> PrinterStatus:
        """Return printer status (ready, busy, error, paper level, etc.)."""

    @abstractmethod
    def print_image(self, image_path: str, copies: int = 1) -> PrintJobResult:
        """Send an image to the printer. Returns a job ID and status."""

    @abstractmethod
    def cancel_print(self, job_id: str) -> bool:
        """Cancel a pending or in-progress print job."""

    @abstractmethod
    def get_print_job_status(self, job_id: str) -> PrintJobStatus:
        """Check the status of a specific print job."""
```

## 10.3 Printing Workflow

```
Customer Presses PRINT
        │
        ▼
Final Image Generated and Validated
        │
        ▼
Create Print Job Record (status: QUEUED)
        │
        ▼
Send to Printer Manager
        │
        ▼
Printer Adapter / Windows Print System
        │
        ▼
Printer (physical device)
        │
        ▼
Print Result Returned
        │
        ├── SUCCESS → status: COMPLETED
        │
        └── FAILED → status: FAILED → Notify operator
```

Every print attempt is recorded with:

- Print job ID
- Session ID
- Final output ID
- Number of copies
- Status (QUEUED, PRINTING, COMPLETED, FAILED)
- Timestamps (created_at, completed_at)

## 10.4 Mock Printer for Development

```python
class MockPrinterAdapter(PrinterInterface):
    """Simulates printing by saving the image to a local 'printed' directory."""

    def print_image(self, image_path: str, copies: int = 1) -> PrintJobResult:
        # Copy image to printed/ directory to simulate successful print
        shutil.copy(image_path, f"mock/printed/{uuid4()}.jpg")
        return PrintJobResult(job_id=str(uuid4()), status=PrintJobStatus.COMPLETED)
```

---