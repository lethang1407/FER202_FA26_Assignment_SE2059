import { Alert, Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { getDashboardData } from '../services/dashboardService';
import { formatDate, formatMonth } from '../utils/date';
import { formatCurrency } from '../utils/format';
import DataState from '../components/common/DataState';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';

function SummaryCard({ label, value, detail, to }) {
  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Body>
        <p className="text-secondary mb-2">{label}</p>
        <p className="h4 mb-2">{value}</p>
        {to ? (
          <Link to={to} className="small">
            {detail}
          </Link>
        ) : (
          <span className="small text-secondary">{detail}</span>
        )}
      </Card.Body>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, loading, error, reload } = useFetch(getDashboardData);

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Tình hình phòng, doanh thu và các khoản cần theo dõi."
      />
      <DataState loading={loading} error={error} onRetry={reload} isEmpty={false}>
        {data && (
          <>
            <Row xs={1} sm={2} lg={4} className="g-3 mb-4">
              <Col>
                <SummaryCard
                  label="Tổng số phòng"
                  value={data.totalRooms}
                  detail="Xem danh sách phòng"
                  to="/rooms"
                />
              </Col>
              <Col>
                <SummaryCard
                  label="Đang thuê"
                  value={data.occupied}
                  detail={`Tỷ lệ lấp đầy ${data.occupancyRate}%`}
                />
              </Col>
              <Col>
                <SummaryCard
                  label="Phòng trống"
                  value={data.available}
                  detail="phòng"
                />
              </Col>
              <Col>
                <SummaryCard
                  label="Đang sửa"
                  value={data.maintenance}
                  detail="phòng"
                />
              </Col>
              <Col>
                <SummaryCard
                  label="Doanh thu tháng này"
                  value={formatCurrency(data.revenueThisMonth)}
                  detail="Tính theo ngày thu tiền"
                />
              </Col>
              <Col>
                <SummaryCard
                  label="Công nợ"
                  value={formatCurrency(data.debt)}
                  detail="Hóa đơn chưa thanh toán"
                  to="/invoices"
                />
              </Col>
              <Col>
                <SummaryCard
                  label="Hóa đơn quá hạn"
                  value={data.overdueCount}
                  detail="Xem hóa đơn"
                  to="/invoices"
                />
              </Col>
              <Col>
                <SummaryCard
                  label="Hợp đồng sắp hết hạn"
                  value={data.expiringContracts.length}
                  detail="Trong 30 ngày tới"
                  to="/contracts"
                />
              </Col>
            </Row>

            <Row xs={1} lg={2} className="g-3">
              <Col>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h5">Hóa đơn quá hạn</h2>
                    {data.overdueInvoices.length ? (
                      <ul className="list-unstyled mb-0">
                        {data.overdueInvoices.slice(0, 5).map((invoice) => (
                          <li
                            key={invoice.id}
                            className="d-flex justify-content-between gap-3 py-2 border-top"
                          >
                            <Link
                              to="/invoices"
                              className="text-decoration-none"
                            >
                              <span className="d-block">
                                {invoice.room?.name || `Phòng #${invoice.roomId}`} ·{' '}
                                {formatMonth(invoice.month)}
                              </span>
                              {invoice.tenant?.fullName && (
                                <span className="small text-secondary">
                                  {invoice.tenant.fullName}
                                </span>
                              )}
                            </Link>
                            <StatusBadge
                              type="invoice"
                              value="overdue"
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Alert variant="light" className="mb-0">
                        Không có hóa đơn quá hạn.
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h5">Hợp đồng sắp hết hạn</h2>
                    {data.expiringContracts.length ? (
                      <ul className="list-unstyled mb-0">
                        {data.expiringContracts.slice(0, 5).map((contract) => (
                          <li
                            key={contract.id}
                            className="d-flex justify-content-between gap-3 py-2 border-top"
                          >
                            <Link
                              to="/contracts"
                              className="text-decoration-none"
                            >
                              {contract.room?.name || `Phòng #${contract.roomId}`}
                              {contract.tenant?.fullName
                                ? ` · ${contract.tenant.fullName}`
                                : ` · Hợp đồng #${contract.id}`}
                            </Link>
                            <span className="text-secondary text-nowrap">
                              {formatDate(contract.endDate)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Alert variant="light" className="mb-0">
                        Không có hợp đồng sắp hết hạn.
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </DataState>
    </>
  );
}
