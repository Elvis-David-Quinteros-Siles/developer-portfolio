import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

/**
 * Cliente GraphQL para el blog. Ruta relativa: nginx → gateway → graphql-api.
 */
export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: "/graphql" }),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          post: {
            keyArgs: ["slug"],
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: { errorPolicy: "all" },
    query: { errorPolicy: "all" },
  },
});
