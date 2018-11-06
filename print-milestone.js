const { addQueryArgs } = require( '@wordpress/url' );
const fetch = require( 'node-fetch' );
const { flatMap, escapeRegExp, filter, max, map, each, padEnd } = require( 'lodash' );

function escapeQuotes( string ) {
	return string.replace( '"', '\\"' );
}

async function fetchOpenMilestoneIssues( milestone ) {
	const query = `repo:wordpress/gutenberg is:issue is:open milestone:"${ escapeQuotes( milestone ) }"`;
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

async function fetchOpenMilestonePRs() {
	const [ issues, prs ] = await Promise.all( [ fetchOpenMilestoneIssues( milestone ), fetchOpenPRs() ] );
	return flatMap( issues, ( issue ) => {
		const expression = new RegExp( '(closes|fixes) +#' + escapeRegExp( issue.number ), 'i' );
		return filter( prs, ( pr ) => expression.test( pr.body ) );
	} );
}

const [ command, script, milestone ] = process.argv;
if ( ! milestone ) {
	console.log( 'Usage: npm run print-milestone <milestone>' );
	process.exit( 0 ); // Exiting with a non-zero status causes npm obscure the actual error
}

fetchOpenMilestonePRs( milestone ).then( ( prs ) => {
	if ( prs.length === 1 ) {
		console.log( `1 PR marked as closing a "${ milestone }" issue:\n` );
	} else {
		console.log( `${ prs.length } PRs marked as closing "${ milestone }" issues:\n` );
	}

	const maxTitleWidth = max( map( prs, ( pr ) => pr.title.length ) );
	each( prs, ( pr ) => {
		console.log( padEnd( pr.title, maxTitleWidth ), pr.html_url );
	} );
} );
