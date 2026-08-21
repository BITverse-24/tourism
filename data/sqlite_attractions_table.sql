CREATE TABLE attraction (
    attraction_id TEXT PRIMARY KEY
        -- CHECK (
        --     length(attraction_id) > 0
        --     AND attraction_id NOT GLOB '*[^a-z0-9_]*'
        --     AND attraction_id NOT GLOB '_*'
        --     AND attraction_id NOT LIKE '%\_' ESCAPE '\'
        -- )
        ,

    city_id TEXT NOT NULL,

    name TEXT NOT NULL
        CHECK (length(trim(name)) > 0),

    alternate_names TEXT
        CHECK (
            alternate_names IS NULL
            OR (
                json_valid(alternate_names)
                AND json_type(alternate_names) = 'array'
            )
        ),

    attraction_type TEXT NOT NULL,

    subtypes TEXT
        CHECK (
            subtypes IS NULL
            OR (
                json_valid(subtypes)
                AND json_type(subtypes) = 'array'
            )
        ),

    description TEXT NOT NULL
        CHECK (length(trim(description)) > 0),

    significance TEXT NOT NULL
        CHECK (
            json_valid(significance)
            AND json_type(significance) = 'array'
            AND json_array_length(significance) > 0
        ),

    location_area TEXT NOT NULL
        CHECK (length(trim(location_area)) > 0),

    latitude REAL NOT NULL
        CHECK (latitude BETWEEN -90 AND 90),

    longitude REAL NOT NULL
        CHECK (longitude BETWEEN -180 AND 180),

    visit_duration_min INTEGER NOT NULL
        CHECK (visit_duration_min > 0),

    visit_duration_typical INTEGER NOT NULL
        CHECK (
            visit_duration_typical > 0
            AND visit_duration_typical >= visit_duration_min
        ),

    visit_duration_max INTEGER
        CHECK (
            visit_duration_max IS NULL
            OR (
                visit_duration_max >= visit_duration_typical
                AND visit_duration_max >= visit_duration_min
            )
        ),

    best_time_of_day TEXT
        CHECK (
            best_time_of_day IS NULL
            OR (
                json_valid(best_time_of_day)
                AND json_type(best_time_of_day) = 'array'
            )
        ),

    best_months TEXT
        CHECK (
            best_months IS NULL
            OR (
                json_valid(best_months)
                AND json_type(best_months) = 'array'
            )
        ),

    avoid_months TEXT
        CHECK (
            avoid_months IS NULL
            OR (
                json_valid(avoid_months)
                AND json_type(avoid_months) = 'array'
            )
        )
        ,

    crowd_level TEXT NOT NULL
        -- CHECK (crowd_level IN (
        --     'Very_Low', 'Low', 'Moderate', 'High', 'Very_High'
        -- ))
        ,

    tourism_level TEXT NOT NULL
        -- CHECK (tourism_level IN (
        --     'Major_Tourist',
        --     'Popular',
        --     'Moderately_Touristed',
        --     'Local',
        --     'Niche'
        -- ))
        ,

    hidden_gem INTEGER NOT NULL
        CHECK (hidden_gem IN (0, 1)),

    discovery_category TEXT NOT NULL
        -- CHECK (discovery_category IN (
        --     'Must_See',
        --     'Popular',
        --     'Local_Favorite',
        --     'Hidden_Gem',
        --     'Offbeat',
        --     'Seasonal',
        --     'Special_Interest',
        --     'Worth_Detour'
        -- ))
        ,

    local_authenticity TEXT NOT NULL
        -- CHECK (local_authenticity IN (
        --     'Very_High', 'High', 'Moderate', 'Low', 'Very_Low'
        -- ))
        ,

    photography_value TEXT NOT NULL
        -- CHECK (photography_value IN (
        --     'Very_High', 'High', 'Moderate', 'Low', 'Very_Low'
        -- ))
        ,

    indoor_outdoor TEXT NOT NULL
        -- CHECK (indoor_outdoor IN ('Indoor', 'Outdoor', 'Mixed'))
        ,

    adventure_level TEXT NOT NULL
        -- CHECK (adventure_level IN (
        --     'None', 'Low', 'Moderate', 'High', 'Extreme'
        -- ))
        ,

    accessibility_level TEXT NOT NULL
        -- CHECK (accessibility_level IN (
        --     'Very_Easy',
        --     'Easy',
        --     'Moderate',
        --     'Difficult',
        --     'Very_Difficult'
        -- ))
        ,

    family_suitability TEXT NOT NULL
        -- CHECK (family_suitability IN (
        --     'Excellent', 'Very_Good', 'Good', 'Moderate', 'Poor', 'Unsuitable'
        -- ))
        ,

    elderly_suitability TEXT NOT NULL
        -- CHECK (elderly_suitability IN (
        --     'Excellent', 'Very_Good', 'Good', 'Moderate', 'Poor', 'Unsuitable'
        -- ))
        ,

    child_suitability TEXT NOT NULL
        -- CHECK (child_suitability IN (
        --     'Excellent', 'Very_Good', 'Good', 'Moderate', 'Poor', 'Unsuitable'
        -- ))
        ,

    romantic_suitability TEXT NOT NULL
        -- CHECK (romantic_suitability IN (
        --     'Excellent', 'Very_Good', 'Good', 'Moderate', 'Poor', 'Unsuitable'
        -- ))
        ,

    booking_required INTEGER
        CHECK (
            booking_required IS NULL
            OR booking_required IN (0, 1)
        ),

    entry_type TEXT NOT NULL
        -- CHECK (entry_type IN (
        --     'Free',
        --     'Paid',
        --     'Donation',
        --     'Restricted',
        --     'Reservation_Required',
        --     'Permit_Required',
        --     'Seasonal'
        -- ))
        ,

    best_for TEXT NOT NULL
        CHECK (
            json_valid(best_for)
            AND json_type(best_for) = 'array'
            AND json_array_length(best_for) > 0
        ),

    source TEXT NOT NULL
        CHECK (
            json_valid(source)
            AND json_type(source) = 'array'
            AND json_array_length(source) > 0
        ),

    last_updated TEXT NOT NULL
        CHECK (
            last_updated GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            AND date(last_updated) IS NOT NULL
            -- AND date(last_updated) <= date('now')
        )
);
