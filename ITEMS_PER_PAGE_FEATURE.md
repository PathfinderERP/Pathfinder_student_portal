# Items Per Page Dropdown Feature

## Feature Added ✅

Added a dropdown selector to control how many student records are displayed per page in the Student Registry.

## Options Available:
- **10** records per page
- **20** records per page
- **30** records per page
- **50** records per page (default)
- **100** records per page

## Implementation Details:

### State Management:
```javascript
const [itemsPerPage, setItemsPerPage] = useState(50); // Changed from constant to state

const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
    setTotalPages(Math.ceil(allStudents.length / newItemsPerPage));
};
```

### UI Component:
```javascript
<select
    value={itemsPerPage}
    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
    className={`px-4 py-2 rounded-[5px] text-xs font-black border...`}
>
    <option value={10}>10</option>
    <option value={20}>20</option>
    <option value={30}>30</option>
    <option value={50}>50</option>
    <option value={100}>100</option>
</select>
```

## Layout:

The pagination controls are now organized in two rows:

### Top Row:
- **Left**: Items per page dropdown ("Show: [dropdown] per page")
- **Right**: Page info ("Showing 1 to 50 of 3425 records")

### Bottom Row:
- **Left**: Pagination buttons (First, Previous, 1, 2, 3, 4, 5, Next, Last)
- **Right**: Jump to page input

## User Experience:

1. **Select items per page** from dropdown
2. **Page automatically resets** to page 1
3. **Total pages recalculated** based on new items per page
4. **Smooth transition** with no data loss

## Example Scenarios:

### Scenario 1: Quick Overview
- Select **100** items per page
- See more data at once
- Fewer pages to navigate

### Scenario 2: Detailed Review
- Select **10** items per page
- Focus on fewer records
- Easier to review individual entries

### Scenario 3: Standard View (Default)
- Keep **50** items per page
- Balanced view
- Good performance

## Responsive Design:

- **Mobile**: Stacks vertically
- **Tablet**: Two columns
- **Desktop**: Full horizontal layout

## Styling:

- **Dark Mode**: White text on dark background with subtle borders
- **Light Mode**: Dark text on white background with clean borders
- **Hover Effect**: Slight background color change
- **Focus Ring**: Orange ring on focus for accessibility

## Benefits:

✅ **Flexibility**: Users choose their preferred view density  
✅ **Performance**: Can load fewer records for faster rendering  
✅ **Usability**: Adapts to different use cases  
✅ **Accessibility**: Keyboard navigable dropdown  
✅ **Consistency**: Matches overall design system
