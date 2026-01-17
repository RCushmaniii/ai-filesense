"""
File Classification Validation Models
Usage: FileClassificationResponse.model_validate(llm_output)
"""

from enum import Enum
from typing import Annotated
from pydantic import BaseModel, Field, field_validator, model_validator
import re


class Category(str, Enum):
    LEGAL = "Legal"
    FINANCIAL = "Financial"
    MEDICAL = "Medical"
    SCHOOL = "School"
    CODE = "Code"
    MEDIA = "Media"
    ARCHIVES = "Archives"
    SPREADSHEETS = "Spreadsheets"
    IMAGES = "Images"
    DOCUMENTS = "Documents"
    WORK = "Work"
    PERSONAL = "Personal"
    OTHER = "Other"


# Subcategory mapping for cross-validation
SUBCATEGORY_MAP: dict[Category, set[str]] = {
    Category.LEGAL: {"Contracts", "Court-Documents", "Policies", "Licenses", "NDAs"},
    Category.FINANCIAL: {"Invoices", "Tax-Returns", "Receipts", "Bank-Statements", "Budgets", "Payroll"},
    Category.MEDICAL: {"Lab-Results", "Prescriptions", "Insurance-Claims", "Medical-Records", "Imaging"},
    Category.SCHOOL: {"Assignments", "Lecture-Notes", "Syllabi", "Transcripts", "Research-Papers"},
    Category.CODE: {"Source-Code", "Scripts", "Config-Files", "Documentation", "Notebooks"},
    Category.MEDIA: {"Video", "Audio", "Podcasts", "Music"},
    Category.ARCHIVES: {"Backups", "Compressed", "Exports"},
    Category.SPREADSHEETS: {"Data-Exports", "Reports", "Trackers", "Logs"},
    Category.IMAGES: {"Photos", "Screenshots", "Vector-Art", "Icons", "Scans"},
    Category.DOCUMENTS: {"Reports", "Letters", "Manuals", "Presentations", "Notes", "Ebooks"},
    Category.WORK: {"Meeting-Notes", "Project-Files", "Communications", "Proposals"},
    Category.PERSONAL: {"Photos", "Journal", "Travel", "Recipes", "Hobbies"},
    Category.OTHER: set(),  # No predefined subcategories
}

# Flatten all valid subcategories for basic validation
ALL_SUBCATEGORIES: set[str] = {sub for subs in SUBCATEGORY_MAP.values() for sub in subs}


class FileClassification(BaseModel):
    """Single file classification result."""

    file_id: Annotated[str, Field(min_length=1, description="Preserved from input")]
    category: Category
    subcategory: Annotated[str | None, Field(description="Must match category or be null")]
    tags: Annotated[list[str], Field(min_length=2, max_length=5)]
    summary: Annotated[str, Field(min_length=10, max_length=80)]
    confidence: Annotated[float, Field(ge=0.50, le=0.98)]
    suggested_folder: Annotated[str, Field(min_length=1, max_length=100)]

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str]) -> list[str]:
        pattern = re.compile(r"^[a-z0-9-]+$")
        for tag in v:
            if len(tag) < 2 or len(tag) > 30:
                raise ValueError(f"Tag '{tag}' must be 2-30 characters")
            if not pattern.match(tag):
                raise ValueError(f"Tag '{tag}' must be lowercase alphanumeric with hyphens only")
        return v

    @field_validator("suggested_folder")
    @classmethod
    def validate_folder_path(cls, v: str) -> str:
        # No leading/trailing slashes, valid path segments
        if v.startswith("/") or v.endswith("/"):
            raise ValueError("Folder path must not have leading or trailing slashes")
        pattern = re.compile(r"^[A-Za-z0-9-]+(/[A-Za-z0-9-]+)*$")
        if not pattern.match(v):
            raise ValueError(f"Invalid folder path format: {v}")
        return v

    @model_validator(mode="after")
    def validate_subcategory_matches_category(self) -> "FileClassification":
        """Ensure subcategory is valid for the given category."""
        if self.subcategory is None:
            return self

        valid_subs = SUBCATEGORY_MAP.get(self.category, set())
        if self.subcategory not in valid_subs:
            # Check if it's a valid subcategory but wrong category
            if self.subcategory in ALL_SUBCATEGORIES:
                raise ValueError(
                    f"Subcategory '{self.subcategory}' is not valid for category '{self.category.value}'. "
                    f"Valid options: {valid_subs or 'null only'}"
                )
            raise ValueError(
                f"Unknown subcategory '{self.subcategory}'. Must be from predefined list or null."
            )
        return self


class FileClassificationResponse(BaseModel):
    """Root response model for LLM output validation."""

    classifications: Annotated[list[FileClassification], Field(min_length=1)]

    def validate_file_ids(self, expected_ids: set[str]) -> list[str]:
        """
        Cross-check that all expected file_ids are present.
        Returns list of missing IDs (empty if valid).
        """
        received_ids = {c.file_id for c in self.classifications}
        missing = expected_ids - received_ids
        extra = received_ids - expected_ids

        errors = []
        if missing:
            errors.append(f"Missing file_ids: {missing}")
        if extra:
            errors.append(f"Unexpected file_ids: {extra}")
        return errors
