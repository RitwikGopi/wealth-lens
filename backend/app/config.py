from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./portfolio.db"
    api_key: str = ""
    zerodha_api_key: str = ""
    zerodha_api_secret: str = ""
    cors_origins: str = "http://localhost:3333"
    frontend_url: str = "http://localhost:3333"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
