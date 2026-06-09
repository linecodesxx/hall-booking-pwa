import { Component } from "react";

export class ErrorBoundary extends Component {
	state = { error: null };
	static getDerivedStateFromError(error) {
		return { error };
	}
	render() {
		if (this.state.error)
			return (
				<article
					className="card empty"
					style={{ cursor: "pointer" }}
					onClick={() => this.setState({ error: null })}
				>
					Что-то пошло не так. Нажмите, чтобы попробовать снова.
				</article>
			);
		return this.props.children;
	}
}
