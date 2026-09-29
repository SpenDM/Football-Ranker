import { describe, expect, it } from 'vitest';
import { teamsByAbbr } from '$lib/data/teams';
import { cityOf, searchTeams } from './team-lookup';

const names = (query: string) => searchTeams(query).map((t) => t.nickname);

describe('searchTeams', () => {
	it('matches city or nickname, ignoring case', () => {
		expect(names('new york')).toEqual(['Giants', 'Jets']);
		expect(names('BEARS')).toEqual(['Bears']);
		expect(names('los')).toEqual(['Chargers', 'Rams']);
	});

	it('puts teams whose city or nickname starts with the query first', () => {
		// "ra": Ravens, Raiders and Rams start with it; "San Francisco 49ers" only contains it.
		expect(names('ra')).toEqual(['Ravens', 'Raiders', 'Rams', '49ers']);
	});

	it('matches an exact abbreviation and returns nothing for a blank query', () => {
		expect(names('kc')).toEqual(['Chiefs']);
		expect(names('  ')).toEqual([]);
	});
});

it('cityOf strips the nickname', () => {
	expect(cityOf(teamsByAbbr.get('NYJ')!)).toBe('New York');
	expect(cityOf(teamsByAbbr.get('WAS')!)).toBe('Washington');
});
