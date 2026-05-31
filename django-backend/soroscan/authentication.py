from rest_framework import authentication
from rest_framework import exceptions
from soroscan.ingest.models import APIKey


class APIKeyAuthentication(authentication.BaseAuthentication):
    """
    Simple API key based authentication.

    Clients should authenticate by passing the token key in the "Authorization"
    HTTP header, prepended with the string "ApiKey ".  For example:

        Authorization: ApiKey 401f7ac837da42b97f613d789819ff93537bee6a

    Alternatively, the key can be passed as a query parameter "api_key".
    """

    def authenticate(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        key_str = None

        if auth.lower().startswith("apikey "):
            key_str = auth[7:].strip()

        if not key_str:
            # Also support query parameter for convenience (e.g. for streaming)
            key_str = request.query_params.get("api_key")

        if not key_str:
            return None

        try:
            api_key = APIKey.objects.select_related("user").get(key=key_str, is_active=True)
        except APIKey.DoesNotExist:
            raise exceptions.AuthenticationFailed("Invalid or inactive API Key")

        # Set the api_key object on the request so throttles can reuse it
        request.api_key = api_key
        return (api_key.user, api_key)

    def authenticate_header(self, request):
        return 'ApiKey realm="api"'
