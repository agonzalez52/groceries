#
# Version 4.1.0
#
# Created By: Angel Gonzalez
#

import sys
import io
import os
sys.path.append('helpers')
import meal_grocery_updates as grc
import meal_components as mc
import google_office as goffice
import color_codes as colors
from datetime import date
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict
from contextlib import redirect_stdout
from dotenv import load_dotenv

load_dotenv()
GDOC_ID_PROD = os.getenv("GDOC_ID_PROD")
GSHEET_ID_PROD = os.getenv("GSHEET_ID_PROD")
GDOC_ID_DEV = os.getenv("GDOC_ID_DEV")
GSHEET_ID_DEV = os.getenv("GSHEET_ID_DEV")
MY_CALENDAR_GMAIL = os.getenv("MY_CALENDAR_GMAIL")
FRONTEND_URL = os.getenv("FRONTEND_URL")

# API request schema
class GroceryRunRequest(BaseModel):
    date: date
    meal_ids: List[int]

    @field_validator("date")
    def validate_monday(cls, v):
        if v.weekday() != 0: # 0 = Monday
            raise ValueError(f"Start date must be Monday, got {v.strftime('%A')}")
        return v

    @field_validator("meal_ids", mode="before")
    def parse_meal_ids(cls, ids_input):
        if isinstance(ids_input, str):
            return [int(id.strip()) for id in ids_input.split(",")]
        return ids_input
        
    @field_validator("meal_ids")
    def validate_number_of_meals(cls, v):
        if len(v) != 6:
            raise ValueError(f"6 meals must be entered, got {len(v)}")
        return v
        
    first_week: bool
    class Flags(BaseModel):
        reminders_only: bool = False
        checklist: bool = True
        test: bool = False
    options: Optional[Flags] = Flags()

# API response schema
class GroceryRunResponse(BaseModel):
    start_date: date = None
    meal_count: int = 0
    meals: List[str] = []
    class MealDetails(BaseModel):
        meal_name: str
        meal_day: str
    meal_details: List[MealDetails] = []

app = FastAPI()

# Allows browser to send OPTIONS request to FastAPI endpoint
# CORS preflight behavior
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # local dev frontend
        "http://localhost:8000",   # local docker frontend
        FRONTEND_URL,  # production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],   # allows OPTIONS, POST, etc
    allow_headers=["*"],
)

# FastAPI endpoint to run groceries script
@app.post("/run")
def run_grocery_script(data: GroceryRunRequest):
    if data.options.test is True:
        doc_id = GDOC_ID_DEV # Test sheet
        sheet_id = GSHEET_ID_DEV # Test sheet
    else:
        doc_id = GDOC_ID_PROD
        sheet_id = GSHEET_ID_PROD
    
    if data.first_week is True:
        font_color = colors.FONT_RED
    else:
        font_color = colors.FONT_PURPLE

    # Build Google services
    doc_service, sheet_service, calendar_service, mail_service = goffice.build_services()
    gdoc = goffice.GoogleDoc(doc_id, doc_service)
    gsheet = goffice.GoogleSheet(sheet_id, sheet_service)
    gcalendar = goffice.GoogleCalendar(MY_CALENDAR_GMAIL, calendar_service)
    gmail = goffice.GoogleMail(mail_service)
    gapi = goffice.GoogleAPI(gdoc, gsheet, gcalendar, gmail)

    meal_batch = mc.MealBatch(data.date, data.meal_ids)
    gapi.gdoc.set_font_color(font_color)
    return grc.update_grocery_list(meal_batch, gapi, True, data.options.reminders_only, data.options.checklist)