import groceries

if __name__ == '__main__':
    service = groceries.main()
    # to create initial doc
    #doc = create_document(service)
    doc = "1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA"

    # INSERT TEXT TEST
    start_h, end_h = groceries.get_text_range_idx(service, doc, "Health", True)
    #print('end_h: '+str(end_h))
    groceries.insert_text(service, doc, end_h, 'floss', groceries.yellow, True)

    start_c, end_c = groceries.get_text_range_idx(service, doc, "Carne", True)
    #print('end_c: '+str(end_c))
    groceries.insert_text(service, doc, end_c, 'chicken (3lb)', groceries.yellow
    , True)

    start_cagain, end_cagain = groceries.get_text_range_idx(service, doc,
    "Carne", True)
    groceries.insert_text(service, doc, end_cagain, 'ground beef',
    groceries.yellow, True)

    start_o, end_o = groceries.get_text_range_idx(service, doc, "Hot stuff",
    True)
    groceries.insert_text(service, doc, end_o, 'chicken wings',
    groceries.yellow, True)

    # CSV TEST
    # Meals = pd.read_csv('Meals Table.csv', index_col='id')
    # Ingredients = pd.read_csv('Ingredients Table.csv')
    #
    # curr_id = 1;
    #
    # # update this_time, last_time variables
    # if Meals.loc[curr_id, 'this_time'] == 1:
    #     Meals.loc[curr_id, 'last_time'] = 1
    # else:
    #     Meals.loc[curr_id, 'this_time'] = 1
    #     Meals.loc[curr_id, 'last_time'] = 0
    #
    # # get meal name corresponding to the specified id
    # Meal_name = Meals.loc[curr_id, 'name']
    #
    # # loops through rows with specified id and prints out the ingredient name/
    # # section
    # for index,row in Ingredients[Ingredients['id']==curr_id].iterrows():
    #     print('Name: '+row['name']+' Section: '+row['section'])

    # Meals.to_csv('Meals Table.csv')
