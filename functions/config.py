import os

# Secret names (for firebase functions:secrets:set)
LINE_CHANNEL_SECRET_KEY = "LINE_CHANNEL_SECRET"
LINE_CHANNEL_ACCESS_TOKEN_KEY = "LINE_CHANNEL_ACCESS_TOKEN"
GEMINI_API_KEY_KEY = "GEMINI_API_KEY"

# These will be available as environment variables when using secrets in Functions Gen 2
class Config:
    @property
    def line_channel_secret(self) -> str:
        return os.environ.get(LINE_CHANNEL_SECRET_KEY, "")

    @property
    def line_channel_access_token(self) -> str:
        return os.environ.get(LINE_CHANNEL_ACCESS_TOKEN_KEY, "")

    @property
    def gemini_api_key(self) -> str:
        return os.environ.get(GEMINI_API_KEY_KEY, "")

    @property
    def line_admin_group_id(self) -> str:
        return os.environ.get("LINE_ADMIN_GROUP_ID", "")

    @property
    def google_sheet_id(self) -> str:
        return os.environ.get("GOOGLE_SHEET_ID", "")

    @property
    def gemini_model(self) -> str:
        return os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")

config = Config()
