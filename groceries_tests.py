import groceries
import pandas as pd
from df2gspread import df2gspread as d2g
import numpy as np

if __name__ == '__main__':
    service, sheet_service = groceries.main()
    # to create initial doc
    #doc = create_document(service)
    doc = "1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA"

    # INSERT TEXT TO DOC TEST
    # start_h, end_h = groceries.get_text_range_idx(service, doc, "Health", True)
    # #print('end_h: '+str(end_h))
    # groceries.insert_text(service, doc, end_h, 'floss', groceries.yellow, True)

    # start_c, end_c = groceries.get_text_range_idx(service, doc, "Carne", True)
    # #print('end_c: '+str(end_c))
    # groceries.insert_text(service, doc, end_c, 'chicken (3lb)', groceries.yellow
    # , True)

    # start_cagain, end_cagain = groceries.get_text_range_idx(service, doc,
    # "Carne", True)
    # groceries.insert_text(service, doc, end_cagain, 'ground beef',
    # groceries.yellow, True)

    # start_o, end_o = groceries.get_text_range_idx(service, doc, "Hot stuff",
    # True)
    # groceries.insert_text(service, doc, end_o, 'chicken wings',
    # groceries.yellow, True)

    # Google sheet TEST
    Meals_old = pd.read_csv('Meals Table.csv', index_col='id')
    Ingredients_old = pd.read_csv('Ingredients Table.csv')

    Meals_data = groceries.pull_sheet_data(sheet_service, 'Meals')
    Meals = pd.DataFrame(Meals_data[1:], columns=Meals_data[0])
    Meals = Meals.set_index('id')
    Ingredients_data = groceries.pull_sheet_data(sheet_service, 'Ingredients')
    Ingredients = pd.DataFrame(Ingredients_data[1:], columns=Ingredients_data[0])

    # TEST updating week and looping through meal ingredients
    ids = [2,16,22]
    for id in ids:
        # get meal name corresponding to the specified id
        Meal_name = Meals.loc[str(id), 'name']

        # update date
        Meals.loc[str(id), 'week'] = '12-12-21'

        # loops through rows with specified id and prints out the ingredient name/
        # section
        for index,row in Ingredients[Ingredients['id']==str(id)].iterrows():
            print('Name: '+row['name']+' Section: '+row['section'])

    # TEST getting only the 'week' column
    date_values = np.reshape(Meals.loc[:,'week'].values.tolist(), (len(Meals.index), 1))
    date_length = len(Meals.index)

    # TEST writing to google sheet - updating date
    response_date = sheet_service.spreadsheets().values().update(
        spreadsheetId=groceries.sheet_id,
        valueInputOption='USER_ENTERED',
        range='Meals!D2:D{}'.format(date_length+1),
        body=dict(
            majorDimension='ROWS',
            values=date_values.tolist())
    ).execute()

    # Loop through meal ids and fore each meal ->
    # Meals: find name, abbrev, extra, notes
    # Meals: edit date
    # Ingredients: find name, section, days_before_action, action, time, notify_who, notify_when
