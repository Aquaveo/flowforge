import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import JSON

from .__base import Base


class VirtualOutput(Base):
    """Persisted reference to artifacts produced by a workflow node."""

    __tablename__ = "virtual_output"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(as_uuid=True), ForeignKey("node.id", ondelete="CASCADE"), nullable=False)

    # Human friendly label for the artifact (e.g., "TEEHR results")
    name = Column(String(255), nullable=False)

    # Storage details
    storage_scheme = Column(String(32), nullable=False, default="s3")  # s3|http|file
    bucket = Column(String(255), nullable=True)
    object_key = Column(String(1024), nullable=True)
    uri = Column(String(2048), nullable=True)  # Fully qualified URI for convenience

    extra = Column(JSON, nullable=True)  # Additional metadata about the artifact

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    node = relationship("Node", back_populates="virtual_outputs")

    def __repr__(self) -> str:
        return f"<VirtualOutput id={self.id} node_id={self.node_id} name='{self.name}'>"
