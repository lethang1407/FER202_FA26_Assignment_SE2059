import { useEffect, useMemo, useState } from 'react';
import { PAGE_SIZE } from '../utils/constants';

export function usePagination(items, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / pageSize);

  useEffect(() => {
    setPage(1);
  }, [items]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, Math.max(totalPages, 1)));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { pageItems, page, setPage, totalPages };
}
