import { gql } from "@apollo/client";

export const POSTS_QUERY = gql`
  query Posts($first: Int, $after: String, $tag: String) {
    posts(first: $first, after: $after, tag: $tag) {
      edges {
        cursor
        node {
          id
          slug
          title
          excerpt
          coverUrl
          tags
          publishedAt
          readingMinutes
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const POST_QUERY = gql`
  query Post($slug: String!) {
    post(slug: $slug) {
      id
      slug
      title
      excerpt
      content
      coverUrl
      tags
      publishedAt
      readingMinutes
    }
  }
`;
