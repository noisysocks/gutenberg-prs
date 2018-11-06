const { addQueryArgs } = require( '@wordpress/url' );
const fetch = require( 'node-fetch' );
const { flatMap, escapeRegExp, filter, each } = require( 'lodash' );
const { sprintf } = require( 'sprintf-js' );

async function fetchOpenFiveDotOhIssues() {
	const query = 'repo:wordpress/gutenberg is:issue is:open milestone:"WordPress 5.0"';
	const url = addQueryArgs( 'https://api.github.com/search/issues?q=repo:wordpress/gutenberg', { q: query } );
	const response = await fetch( url );
	const { items } = await response.json();
	return items;
}

async function fetchOpenPRs() {
	const query = 'repo:wordpress/gutenberg is:pr is:open';
	const url = addQueryArgs( 'https://api.github.com/search/issues?q=repo:wordpress/gutenberg', { q: query } );
	const response = await fetch( url );
	const { items } = await response.json();
	return items;
}

async function fetchOpenFiveDotOhPRs() {
	const [ issues, prs ] = await Promise.all( [ fetchOpenFiveDotOhIssues(), fetchOpenPRs() ] );
	return flatMap( issues, ( issue ) => {
		const expression = new RegExp( '(closes|fixes) +#' + escapeRegExp( issue.number ), 'i' );
		return filter( prs, ( pr ) => expression.test( pr.body ) );
	} );
}

fetchOpenFiveDotOhPRs().then( ( prs ) => {
	if ( prs.length === 1 ) {
		console.log( `1 PR marked as closing a WordPress 5.0 issue:\n` );
	} else {
		console.log( `${ prs.length } PRs marked as closing WordPress 5.0 issues:\n` );
	}

	each( prs, ( pr ) => {
		console.log( sprintf( '%-80s %s', pr.title, pr.html_url ) );
	} );
} );
