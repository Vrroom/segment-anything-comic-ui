import React, { useState } from "react";
import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import IconButton from "./iconbutton";
import { ReactComponent as ContactUs } from "../icons/contact.svg";
import { ReactComponent as Help } from "../icons/help.svg";
import HelpModal from "./helpmodal";

function sendEmail() {
  window.open(
    "mailto:sumit.chaturvedi@gmail.com?subject=Comic Annotation App"
  );
}

function Nav(props) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Navbar>
        <Container className="border-bottom">
          <Navbar.Brand>
            <h1>ComicCut</h1>
          </Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse className="justify-content-end">
            <Row>
              <Col>
                <IconButton
                  name="Help"
                  active={true}
                  onClick={() => setShow(true)}
                >
                  <Help />
                </IconButton>
              </Col>
              <Col>
                <IconButton name="Contact Us" active={true} onClick={sendEmail}>
                  <ContactUs />
                </IconButton>
              </Col>
            </Row>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <HelpModal show={show} onHide={() => setShow(false)} />
    </>
  );
}

export default Nav;
