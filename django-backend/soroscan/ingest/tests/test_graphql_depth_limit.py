import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestGraphQLDepthLimit:
    def test_simple_query_is_accepted(self):
        client = APIClient()
        response = client.post(
            "/graphql/",
            {"query": "query { contracts { contractId } }"},
            format="json",
        )

        assert response.status_code == 200
        assert "errors" not in response.json()

    def test_deep_query_is_rejected_with_clear_error(self):
        client = APIClient()
        deep_query = """
            query {
              __schema {
                types {
                  fields {
                    type {
                      ofType {
                        ofType {
                          ofType {
                            ofType {
                              ofType {
                                ofType {
                                  ofType {
                                    ofType {
                                      ofType {
                                        ofType {
                                          ofType {
                                            ofType {
                                              ofType {
                                                ofType {
                                                  name
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
        """
        response = client.post("/graphql/", {"query": deep_query}, format="json")

        assert response.status_code == 400
        body = response.json()
        assert "errors" in body
        assert "maximum allowed depth" in body["errors"][0]["message"]
