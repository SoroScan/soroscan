import json
import zstandard as zstd
from django.db import models

class CompressedJSONField(models.BinaryField):
    """
    A field that transparently compresses JSON data using zstandard before
    saving it to the database, and decompresses it upon retrieval.
    It inherits from BinaryField because the database will store compressed binary data.
    """

    description = "A JSON object compressed using zstandard"

    def get_prep_value(self, value):
        # Convert Python object to JSON string, then compress it
        if value is None:
            return value
        
        json_str = json.dumps(value).encode('utf-8')
        cctx = zstd.ZstdCompressor()
        compressed_data = cctx.compress(json_str)
        
        # Call the parent's get_prep_value which expects bytes
        return super().get_prep_value(compressed_data)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
            
        if isinstance(value, memoryview):
            value = value.tobytes()
            
        if isinstance(value, str):
            # Fallback for uncompressed existing data if we didn't migrate it
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass
                
        # Attempt decompression
        try:
            dctx = zstd.ZstdDecompressor()
            decompressed_str = dctx.decompress(value).decode('utf-8')
            return json.loads(decompressed_str)
        except Exception:
            # If decompression fails, maybe it's uncompressed binary JSON
            try:
                return json.loads(value.decode('utf-8'))
            except Exception:
                pass
        
        return value

    def to_python(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass
        elif isinstance(value, bytes):
            # Attempt decompression for deserialization
            try:
                dctx = zstd.ZstdDecompressor()
                decompressed_str = dctx.decompress(value).decode('utf-8')
                return json.loads(decompressed_str)
            except Exception:
                try:
                    return json.loads(value.decode('utf-8'))
                except Exception:
                    pass
        elif isinstance(value, dict) or isinstance(value, list):
            return value
            
        return value
