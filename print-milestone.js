const { addQueryArgs } = require( '@wordpress/url' );
const fetch = require( 'node-fetch' );
const parseLinkHeader = require( 'parse-link-header' );
const { get, flatMap, escapeRegExp, filter, max, map, each, padEnd } = require( 'lodash' );

async function search( query ) {
	const allItems = [];

	let url = addQueryArgs( 'https://api.github.com/search/issues?q=repo:wordpress/gutenberg', { q: query } );

	do {
		const response = await fetch( url );

		const link = parseLinkHeader( response.headers.get( 'link' ) );
		url = get( link, 'next.url', null );

		const { items = [] } = await response.json();
		allItems.push( ...items );
	} while ( url );

	return allItems;
}

function escapeQuotes( string ) {
	return string.replace( '"', '\\"' );
}

function fetchOpenMilestoneIssues( milestone ) {
	return search( `repo:wordpress/gutenberg is:issue is:open milestone:"${ escapeQuotes( milestone ) }"` );
}

function fetchOpenPRs() {
	return search( 'repo:wordpress/gutenberg is:pr is:open' );
}

async function fetchOpenMilestonePRs() {
	const [ issues, prs ] = await Promise.all( [ fetchOpenMilestoneIssues( milestone ), fetchOpenPRs() ] );
	return flatMap( issues, ( issue ) => {
		const expression = new RegExp(
			(
				'(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved):? +' +
				`(#${ escapeRegExp( issue.number ) }|${ escapeRegExp( issue.html_url ) })`
			),
			'i'
		);
		return filter( prs, ( pr ) => expression.test( pr.body ) );
	} );
}

const [ command, script, milestone ] = process.argv;
if ( ! milestone ) {
	console.log( 'Usage: npm run print-milestone <milestone>' );
	process.exit( 0 ); // Exiting with a non-zero status causes npm obscure the actual error
}

console.log( `Searching for PRs that close issues in the "${ milestone }" milestone…` );

fetchOpenMilestonePRs( milestone ).then( ( prs ) => {
	if ( prs.length === 0 ) {
		console.log( '\nDone! But no PRs were found.' );
	} else if ( prs.length === 1 ) {
		console.log( '\nDone! 1 PR found:\n' );
	} else {
		console.log( `\nDone! ${ prs.length } PRs found:\n` );
	}

	const maxTitleWidth = max( map( prs, ( pr ) => pr.title.length ) );
	each( prs, ( pr ) => {
		console.log( padEnd( pr.title, maxTitleWidth ), pr.html_url );
	} );
} );
