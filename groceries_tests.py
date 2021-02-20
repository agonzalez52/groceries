import groceries
import pandas as pd

if __name__ == '__main__':
    service, sheet_service = groceries.main()
    # to create initial doc
    #doc = create_document(service)
    doc = "1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA"

    # INSERT TEXT TEST
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

    # CSV TEST
    Meals_data = groceries.pull_sheet_data(sheet_service, groceries.sheet, 'Meals')
    Meals = pd.DataFrame(Meals_data[1:], columns=data[0])
    Ingredients_data = groceries.pull_sheet_data(sheet_service, groceries.sheet, 'Ingredients')
    Ingredients = pd.DataFrame(Ingredients_data[1:], columns=data[0])
    
    curr_id = 1
    # get meal name corresponding to the specified id
    Meal_name = Meals.loc[curr_id, 'name']
    
    # loops through rows with specified id and prints out the ingredient name/
    # section
    for index,row in Ingredients[Ingredients['id']==curr_id].iterrows():
        print('Name: '+row['name']+' Section: '+row['section'])

    # Meals.to_csv('Meals Table.csv')
    # Loop through meal ids and fore each meal ->
    # Meals: find name, abbrev, extra, notes
    # Meals: edit date 
    # Ingredients: find name, section, days_before_action, action, time, notify_who, notify_when
