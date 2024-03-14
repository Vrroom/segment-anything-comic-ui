import React, { Component } from "react";
import Nav from "./nav";
import GroupUI from "./groupui";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";

class Slides extends Component {
  constructor (props) {
    super(props);
    this.state = { crossClicked: false };
  }

  handleCrossClick = () => {
    this.setState((prevState) => {
      setTimeout(() => {
        this.setState({ crossClicked: false }); 
      }, 200); 
      return { crossClicked: true }; 
    }); 
  }

  render () {
    const { crossClicked } = this.state; 
    return (
      <>
        <Nav />
        <Container id="app-container">
          <Row className="slide-content">
            {crossClicked ? <></> : <GroupUI target="/inference" onClickCross={this.handleCrossClick} />}
          </Row>
        </Container>
      </>
    );
  }
}

export default Slides;
