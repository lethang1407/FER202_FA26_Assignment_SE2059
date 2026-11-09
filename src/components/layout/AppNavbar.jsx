import { useState } from 'react';
import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  ['/', 'Tổng quan'],
  ['/rooms', 'Phòng'],
  ['/tenants', 'Người thuê'],
  ['/contracts', 'Hợp đồng'],
  ['/invoices', 'Hóa đơn'],
];

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Navbar
      bg="white"
      expand="lg"
      className="border-bottom shadow-sm"
      expanded={expanded}
      onToggle={setExpanded}
    >
      <Container fluid="lg">
        <Navbar.Brand as={Link} to="/" className="fw-semibold">
          Quản lý phòng trọ
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navigation" />
        <Navbar.Collapse id="main-navigation">
          <Nav className="me-auto">
            {NAV_ITEMS.map(([to, label]) => (
              <Nav.Link
                as={NavLink}
                to={to}
                end={to === '/'}
                key={to}
                onClick={() => setExpanded(false)}
              >
                {label}
              </Nav.Link>
            ))}
          </Nav>
          <div className="d-flex align-items-center gap-3 py-2 py-lg-0">
            <span className="text-secondary small">{user?.fullName}</span>
            <Button variant="outline-secondary" size="sm" onClick={signOut}>
              Đăng xuất
            </Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
