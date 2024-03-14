import React from "react";
import Nav from "./nav";
import GroupUI from "./groupui";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";

function Slides(props) {
  return (
    <>
      <Nav />
      <Container id="app-container">
        <Row className="slide-content">
          <GroupUI target="/inference" />
        </Row>
      </Container>
    </>
  );
}

export default Slides;
