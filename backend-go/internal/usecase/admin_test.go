package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/portfolio/backend-go/internal/domain"
	"github.com/portfolio/backend-go/internal/usecase"
)

type fakeMessagesRepo struct {
	items  []domain.ContactMessage
	total  int64
	err    error
	limit  int
	offset int
}

func (f *fakeMessagesRepo) List(_ context.Context, limit, offset int) ([]domain.ContactMessage, int64, error) {
	f.limit, f.offset = limit, offset
	return f.items, f.total, f.err
}

func TestAdminMessagesList_Pagination(t *testing.T) {
	tests := []struct {
		name       string
		page       int
		pageSize   int
		total      int64
		wantLimit  int
		wantOffset int
		wantPage   int
		wantPages  int
	}{
		{"defaults applied", 0, 0, 45, usecase.DefaultPageSize, 0, 1, 3},
		{"negative page normalized", -3, 10, 45, 10, 0, 1, 5},
		{"second page offset", 2, 10, 45, 10, 10, 2, 5},
		{"page size capped at max", 1, 500, 45, usecase.MaxPageSize, 0, 1, 1},
		{"empty result", 1, 20, 0, 20, 0, 1, 0},
		{"exact multiple of page size", 3, 15, 45, 15, 30, 3, 3},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &fakeMessagesRepo{total: tc.total}
			uc := usecase.NewAdminMessages(repo)

			_, page, err := uc.List(context.Background(), tc.page, tc.pageSize)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if repo.limit != tc.wantLimit || repo.offset != tc.wantOffset {
				t.Fatalf("repo called with limit=%d offset=%d, want limit=%d offset=%d",
					repo.limit, repo.offset, tc.wantLimit, tc.wantOffset)
			}
			if page.Number != tc.wantPage || page.TotalPages != tc.wantPages || page.TotalItems != tc.total {
				t.Fatalf("page = %+v, want number=%d totalPages=%d totalItems=%d",
					page, tc.wantPage, tc.wantPages, tc.total)
			}
		})
	}
}

func TestAdminMessagesList_RepoError(t *testing.T) {
	repoErr := errors.New("db down")
	uc := usecase.NewAdminMessages(&fakeMessagesRepo{err: repoErr})

	_, _, err := uc.List(context.Background(), 1, 20)
	if !errors.Is(err, repoErr) {
		t.Fatalf("expected repo error, got %v", err)
	}
}
