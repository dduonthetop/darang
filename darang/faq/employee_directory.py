from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List


@dataclass
class Employee:
    employee_id: str
    name: str


class EmployeeDirectoryError(RuntimeError):
    pass


BASE_DIR = Path(__file__).resolve().parent
EMPLOYEE_XLSX_FILE = BASE_DIR / "employee.xlsx"
EMPLOYEE_FILE = BASE_DIR / "Employee_list(2026-03-14).xls"


def mask_name(name: str) -> str:
    clean = (name or "").strip()
    if not clean:
        return ""
    if len(clean) <= 1:
        return clean
    if len(clean) == 2:
        return clean[0] + "*"
    return clean[0] + ("*" * (len(clean) - 2)) + clean[-1]


def _clean_cell(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw)
    text = text.replace("&nbsp;", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _parse_html_table_rows(sheet_text: str) -> List[List[str]]:
    rows: List[List[str]] = []
    for row_match in re.finditer(r"<tr[^>]*>(.*?)</tr>", sheet_text, flags=re.I | re.S):
        row_html = row_match.group(1)
        cells = [
            _clean_cell(cell_match.group(1))
            for cell_match in re.finditer(r"<t[dh][^>]*>(.*?)</t[dh]>", row_html, flags=re.I | re.S)
        ]
        if any(cells):
            rows.append(cells)
    return rows


def _load_sheet_html(path: Path) -> str:
    raw = path.read_text(encoding="utf-8", errors="ignore")
    match = re.search(r'WorksheetSource HRef="([^"]+)"', raw, flags=re.I)
    if not match:
        # Some exports embed the table in the same file.
        return raw

    sheet_path = path.parent / match.group(1)
    if not sheet_path.exists():
        raise EmployeeDirectoryError(
            "Employee list workbook references an external sheet file, "
            f"but it is missing: {sheet_path}"
        )
    return sheet_path.read_text(encoding="utf-8", errors="ignore")


def _find_header_indexes(headers: List[str]) -> tuple[int, int]:
    id_idx = -1
    name_idx = -1
    for idx, header in enumerate(headers):
        normalized = header.replace(" ", "").lower()
        if normalized in {"사번", "직원번호", "empno", "employeeid", "id"}:
            id_idx = idx
        if normalized in {"이름", "성명", "직원명", "name"}:
            name_idx = idx
    if id_idx < 0 or name_idx < 0:
        raise EmployeeDirectoryError(
            "Could not find employee id/name columns in employee list."
        )
    return id_idx, name_idx


def load_employee_directory(path: Path | None = None) -> Dict[str, Employee]:
    employee_path = path or (EMPLOYEE_XLSX_FILE if EMPLOYEE_XLSX_FILE.exists() else EMPLOYEE_FILE)
    if not employee_path.exists():
        raise EmployeeDirectoryError(f"Employee list file not found: {employee_path}")

    if employee_path.suffix.lower() == ".xlsx":
        return load_employee_directory_from_xlsx(employee_path)

    sheet_text = _load_sheet_html(employee_path)
    rows = _parse_html_table_rows(sheet_text)
    if not rows:
        raise EmployeeDirectoryError("Employee list does not contain readable table rows.")

    header_row = None
    header_indexes = (-1, -1)
    for row in rows[:20]:
        try:
            header_indexes = _find_header_indexes(row)
            header_row = row
            break
        except EmployeeDirectoryError:
            continue

    if header_row is None:
        raise EmployeeDirectoryError(
            "Employee list was found, but the employee id/name header row could not be identified."
        )

    id_idx, name_idx = header_indexes
    employees: Dict[str, Employee] = {}
    started = False
    for row in rows:
        if row == header_row:
            started = True
            continue
        if not started:
            continue
        if id_idx >= len(row) or name_idx >= len(row):
            continue

        employee_id = re.sub(r"\D", "", row[id_idx])
        name = row[name_idx].strip()
        if not employee_id or not name:
            continue
        employees[employee_id] = Employee(employee_id=employee_id, name=mask_name(name))

    if not employees:
        raise EmployeeDirectoryError("No employee accounts could be loaded from the employee list.")

    return employees


def load_employee_directory_from_xlsx(path: Path) -> Dict[str, Employee]:
    from zipfile import ZipFile
    import xml.etree.ElementTree as ET

    ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    with ZipFile(path) as zf:
        shared_strings: List[str] = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in root.findall("a:si", ns):
                texts = [t.text or "" for t in si.iterfind(".//a:t", ns)]
                shared_strings.append("".join(texts))

        sheet = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))
        rows = []
        sheet_data = sheet.find("a:sheetData", ns)
        if sheet_data is None:
            raise EmployeeDirectoryError("Employee xlsx does not contain sheet data.")

        for row in sheet_data.findall("a:row", ns):
            current_row: List[str] = []
            for cell in row.findall("a:c", ns):
                value = ""
                cell_type = cell.attrib.get("t")
                cell_value = cell.find("a:v", ns)
                if cell_value is not None and cell_value.text is not None:
                    value = cell_value.text
                    if cell_type == "s":
                        value = shared_strings[int(value)]
                current_row.append(value.strip())
            if any(current_row):
                rows.append(current_row)

    if not rows:
        raise EmployeeDirectoryError("Employee xlsx does not contain readable rows.")

    header_indexes = _find_header_indexes(rows[0])
    id_idx, name_idx = header_indexes
    employees: Dict[str, Employee] = {}

    for row in rows[1:]:
        if id_idx >= len(row) or name_idx >= len(row):
            continue
        employee_id = re.sub(r"\D", "", row[id_idx])
        name = row[name_idx].strip()
        if not employee_id or not name:
            continue
        employees[employee_id] = Employee(employee_id=employee_id, name=mask_name(name))

    if not employees:
        raise EmployeeDirectoryError("No employee accounts could be loaded from the employee xlsx.")

    return employees
