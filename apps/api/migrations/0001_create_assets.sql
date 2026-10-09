CREATE TABLE assets (
    asset_id INTEGER PRIMARY KEY,
    status INTEGER NOT NULL,
    capital_value TEXT NOT NULL,
    income_value TEXT NOT NULL,
    metadata_uri TEXT NOT NULL,
    total_supply TEXT NOT NULL,
    available_supply TEXT NOT NULL,
    share_price TEXT NOT NULL,
    trading_enabled BOOLEAN NOT NULL
);
